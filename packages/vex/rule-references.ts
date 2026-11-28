import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { type OsmdContext, renderers } from '@vexml/renderer';
import type { Fs, Ps } from 'core/system';
import { PNG } from 'pngjs';
import { z } from 'zod';
import {
	cropRect,
	type PixelRect,
	type RenderGeometry,
	type RuleCrop,
} from './rule-checks';
import {
	cropMusescoreSvg,
	cropVerovioSvg,
	mapFlatStaffIndex,
	parseMusescoreGeometry,
	parseVerovioGeometry,
	partStaffCounts,
	type ReferenceGeometry,
} from './rule-reference-geometry';

/** Supported third-party reference renderers shown beside vexml. */
export type ReferenceRendererId = 'musescore' | 'verovio' | 'osmd';

/** One reference renderer tile for a check, ready to display or explaining why it is missing. */
export interface RuleReferenceTile {
	id: ReferenceRendererId;
	label: string;
	status: 'ready' | 'unavailable';
	/** Shown on the tile when unavailable (for example, MuseScore 4 not installed). */
	reason?: string;
	/** Cropped SVG or PNG URL when ready. */
	url?: string;
	width?: number;
	height?: number;
	/** A staff space in the crop's coordinate units, for scaling to match vexml. */
	space?: number;
}

/**
 * The reference render cache outside any worktree, `<git-common-dir>/vex-rule-references`,
 * so the slow MuseScore renders survive worktree deletion.
 */
export async function resolveRuleReferenceCacheDir(ps: Ps): Promise<string> {
	const { exitCode, stdout } = await ps.spawnCapture([
		'git',
		'rev-parse',
		'--path-format=absolute',
		'--git-common-dir',
	]);
	const commonDir = stdout.trim();
	return exitCode === 0 && commonDir
		? path.join(commonDir, 'vex-rule-references')
		: '.vex/rule-references';
}

export const DEFAULT_MSCORE_BIN =
	'/Applications/MuseScore 4.app/Contents/MacOS/mscore';

export const REFERENCE_RENDERERS: readonly {
	id: ReferenceRendererId;
	label: string;
}[] = [
	{ id: 'musescore', label: 'MuseScore' },
	{ id: 'verovio', label: 'Verovio' },
	{ id: 'osmd', label: 'OSMD' },
];

/**
 * Renders MusicXML fixtures in MuseScore 4, Verovio, and OSMD, caching each full render
 * and its detected measure/staff geometry by fixture hash under `cacheDir`, then crops
 * any check's declared region on demand.
 */
export class RuleReferenceCache {
	private readonly inflight = new Map<string, Promise<CachedRender | null>>();
	private readonly unavailable = new Map<string, string>();
	private readonly mscoreBin: string;

	constructor(private readonly env: ReferenceRendererEnv) {
		this.mscoreBin =
			env.mscoreBin ?? process.env.VEX_MSCORE_BIN ?? DEFAULT_MSCORE_BIN;
	}

	/** Renders (or loads from cache) and crops all three reference renderers for one check. */
	async cropAll(
		opts: CropAllReferencesOptions,
	): Promise<ReferenceCropResult[]> {
		return Promise.all(
			REFERENCE_RENDERERS.map(({ id, label }) =>
				this.cropOne(id, label, opts.musicXML, opts.crop, opts.imageUrl(id)),
			),
		);
	}

	/** Renders (or loads from cache) and crops one reference renderer for a check. */
	async cropOne(
		id: ReferenceRendererId,
		label: string,
		musicXML: string,
		crop: RuleCrop,
		url: string,
	): Promise<ReferenceCropResult> {
		const hash = sha256(musicXML);
		const key = `${id}:${hash}`;
		try {
			const cached = await this.ensureRendered(id, hash, musicXML);
			if (!cached) {
				return {
					tile: {
						id,
						label,
						status: 'unavailable',
						reason: this.unavailable.get(key) ?? `${label} unavailable`,
					},
				};
			}
			const cropped = await this.extractCrop(id, cached, crop);
			if (!cropped) {
				return {
					tile: {
						id,
						label,
						status: 'unavailable',
						reason: `Measure ${crop.measure} not found in ${label}`,
					},
				};
			}
			return {
				tile: {
					id,
					label,
					status: 'ready',
					url,
					width: cropped.rect.w,
					height: cropped.rect.h,
					space: cropped.rect.space,
				},
				bytes: cropped.bytes,
				contentType: cropped.contentType,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				tile: {
					id,
					label,
					status: 'unavailable',
					reason: message,
				},
			};
		}
	}

	private ensureRendered(
		id: ReferenceRendererId,
		hash: string,
		musicXML: string,
	): Promise<CachedRender | null> {
		const key = `${id}:${hash}`;
		const existing = this.inflight.get(key);
		if (existing) {
			return existing;
		}
		const run = this.loadOrRender(id, hash, musicXML).finally(() => {
			this.inflight.delete(key);
		});
		this.inflight.set(key, run);
		return run;
	}

	private async loadOrRender(
		id: ReferenceRendererId,
		hash: string,
		musicXML: string,
	): Promise<CachedRender | null> {
		const dir = path.join(this.env.cacheDir, id, `${CACHE_VERSION}-${hash}`);
		const geomFile = path.join(dir, 'geometry.json');
		if (await this.env.fs.exists(geomFile)) {
			try {
				const parsed = referenceGeometrySchema.safeParse(
					JSON.parse(await this.env.fs.read(geomFile)),
				);
				if (parsed.success && parsed.data.pages.length > 0) {
					return { geometry: parsed.data, dir };
				}
			} catch {
				// Re-render if cache metadata is corrupt.
			}
		}

		const partStaves = partStaffCounts(musicXML);
		if (id === 'verovio') {
			return this.renderVerovio(dir, musicXML, partStaves);
		}
		if (id === 'musescore') {
			return this.renderMusescore(dir, hash, musicXML, partStaves);
		}
		return this.renderOsmd(dir, musicXML, partStaves);
	}

	private async renderVerovio(
		dir: string,
		musicXML: string,
		partStaves: number[],
	): Promise<CachedRender> {
		const tk = await getVerovioToolkit();
		tk.setOptions({
			scale: 60,
			adjustPageHeight: true,
			pageWidth: 1700,
			footer: 'none',
			header: 'none',
		});
		tk.loadData(musicXML);
		const pageCount = tk.getPageCount();
		const pages: string[] = [];
		for (let p = 1; p <= pageCount; p++) {
			pages.push(tk.renderToSVG(p));
		}
		const geometry = parseVerovioGeometry(pages, partStaves);
		await this.env.fs.mkdir(dir, { recursive: true });
		for (let i = 0; i < pages.length; i++) {
			await this.env.fs.write(
				path.join(dir, `page-${i + 1}.svg`),
				pages[i] ?? '',
			);
		}
		await this.env.fs.write(
			path.join(dir, 'geometry.json'),
			JSON.stringify(geometry),
		);
		return { geometry, dir };
	}

	private async renderMusescore(
		dir: string,
		hash: string,
		musicXML: string,
		partStaves: number[],
	): Promise<CachedRender | null> {
		if (!(await this.env.fs.exists(this.mscoreBin))) {
			this.unavailable.set(`musescore:${hash}`, 'MuseScore 4 not installed');
			return null;
		}
		const work = await mkdtemp(path.join(tmpdir(), 'vexml-mscore-ref-'));
		try {
			const input = path.join(work, 'score.musicxml');
			const svgOut = path.join(work, 'score.svg');
			const mposOut = path.join(work, 'score.mpos');
			const jobFile = path.join(work, 'job.json');
			await this.env.fs.write(input, musicXML);
			await this.env.fs.write(
				jobFile,
				JSON.stringify([{ in: input, out: [svgOut, mposOut] }]),
			);
			// MuseScore 4 on macOS can crash during C++ static teardown after writing all outputs,
			// so verify the generated files rather than rejecting solely on exit code.
			await this.env.ps.spawnCapture([this.mscoreBin, '-j', jobFile]);

			const files = await readdir(work);
			const svgFiles = files
				.filter((f) => /^score(?:-\d+)?\.svg$/.test(f))
				.sort(comparePageFiles);
			if (svgFiles.length === 0 || !(await this.env.fs.exists(mposOut))) {
				this.unavailable.set(
					`musescore:${hash}`,
					'MuseScore 4 produced no output',
				);
				return null;
			}
			const pages = await Promise.all(
				svgFiles.map((f) => this.env.fs.read(path.join(work, f))),
			);
			const mpos = await this.env.fs.read(mposOut);
			const geometry = parseMusescoreGeometry(pages, mpos, partStaves);
			await this.env.fs.mkdir(dir, { recursive: true });
			for (let i = 0; i < pages.length; i++) {
				await this.env.fs.write(
					path.join(dir, `page-${i + 1}.svg`),
					pages[i] ?? '',
				);
			}
			await this.env.fs.write(
				path.join(dir, 'geometry.json'),
				JSON.stringify(geometry),
			);
			return { geometry, dir };
		} finally {
			await rm(work, { recursive: true, force: true });
		}
	}

	private async renderOsmd(
		dir: string,
		musicXML: string,
		partStaves: number[],
	): Promise<CachedRender> {
		const { image, result } = await renderers
			.osmd({ musicXML })
			.eval(osmdGeometryCapture);
		const png = PNG.sync.read(image);
		const staves = result.staves.map((s) => {
			const mapped = mapFlatStaffIndex(s.flatStaff, partStaves);
			return {
				page: 0,
				part: mapped.part,
				measure: s.measure,
				staff: mapped.staff,
				lines: s.lines,
				x: s.x,
				w: s.w,
			};
		});
		const measures = result.measures.map((m) => ({ ...m, page: 0 }));
		const geometry: ReferenceGeometry = {
			format: 'png',
			pages: [{ width: png.width, height: png.height }],
			measures,
			staves,
		};
		await this.env.fs.mkdir(dir, { recursive: true });
		await this.env.fs.writeBytes(path.join(dir, 'page-1.png'), image);
		await this.env.fs.write(
			path.join(dir, 'geometry.json'),
			JSON.stringify(geometry),
		);
		return { geometry, dir };
	}

	private async extractCrop(
		id: ReferenceRendererId,
		cached: CachedRender,
		crop: RuleCrop,
	): Promise<{
		rect: PixelRect;
		bytes: Buffer;
		contentType: 'image/svg+xml' | 'image/png';
	} | null> {
		const index = crop.measure - 1;
		const stave = cached.geometry.staves.find(
			(s) =>
				s.measure === index &&
				s.part === crop.part - 1 &&
				s.staff === crop.staff,
		);
		if (!stave) {
			return null;
		}
		const pageIdx = stave.page;
		const bounds = cached.geometry.pages[pageIdx];
		if (!bounds) {
			return null;
		}
		const pageGeometry: RenderGeometry = {
			screenshot: '',
			measures: cached.geometry.measures.filter((m) => m.page === pageIdx),
			staves: cached.geometry.staves.filter((s) => s.page === pageIdx),
		};
		const rect = cropRect(crop, pageGeometry, bounds);
		if (!rect) {
			return null;
		}
		if (cached.geometry.format === 'svg') {
			const svg = await this.env.fs.read(
				path.join(cached.dir, `page-${pageIdx + 1}.svg`),
			);
			const croppedSvg =
				id === 'verovio'
					? cropVerovioSvg(svg, rect)
					: cropMusescoreSvg(svg, rect);
			return {
				rect,
				bytes: Buffer.from(croppedSvg, 'utf8'),
				contentType: 'image/svg+xml',
			};
		}
		const raw = await this.env.fs.readBytes(
			path.join(cached.dir, `page-${pageIdx + 1}.png`),
		);
		const full = PNG.sync.read(Buffer.from(raw));
		const out = new PNG({ width: rect.w, height: rect.h });
		PNG.bitblt(full, out, rect.x, rect.y, rect.w, rect.h, 0, 0);
		return {
			rect,
			bytes: PNG.sync.write(out),
			contentType: 'image/png',
		};
	}
}

export interface CropAllReferencesOptions {
	musicXML: string;
	crop: RuleCrop;
	imageUrl: (renderer: ReferenceRendererId) => string;
}

export interface ReferenceCropResult {
	tile: RuleReferenceTile;
	/** Cropped image bytes (SVG or PNG) when `tile.status === 'ready'`. */
	bytes?: Buffer;
	contentType?: 'image/svg+xml' | 'image/png';
}

export interface ReferenceRendererEnv {
	fs: Fs;
	ps: Ps;
	cacheDir: string;
	/** Path to MuseScore 4 CLI binary; defaults to macOS install path or `VEX_MSCORE_BIN`. */
	mscoreBin?: string;
}

const CACHE_VERSION = 'v1';

const referenceGeometrySchema = z.object({
	format: z.enum(['svg', 'png']),
	pages: z.array(z.object({ width: z.number(), height: z.number() })),
	measures: z.array(
		z.object({
			page: z.number(),
			index: z.number(),
			system: z.number(),
			x: z.number(),
			w: z.number(),
		}),
	),
	staves: z.array(
		z.object({
			page: z.number(),
			part: z.number(),
			measure: z.number(),
			staff: z.number(),
			lines: z.array(z.number()),
			x: z.number(),
			w: z.number(),
		}),
	),
});

interface CachedRender {
	geometry: ReferenceGeometry;
	dir: string;
}

function comparePageFiles(a: string, b: string): number {
	const num = (s: string) => Number(/-(\d+)\.svg$/.exec(s)?.[1] ?? 0);
	return num(a) - num(b) || a.localeCompare(b);
}

function sha256(text: string): string {
	return createHash('sha256').update(text).digest('hex');
}

interface VerovioToolkitLike {
	setOptions(opts: Record<string, unknown>): void;
	loadData(data: string): boolean;
	getPageCount(): number;
	renderToSVG(page: number): string;
}

let verovioPromise: Promise<VerovioToolkitLike> | null = null;
async function getVerovioToolkit(): Promise<VerovioToolkitLike> {
	verovioPromise ??= (async () => {
		const [{ default: createVerovioModule }, { VerovioToolkit }] =
			await Promise.all([import('verovio/wasm'), import('verovio/esm')]);
		const mod = await createVerovioModule();
		return new VerovioToolkit(mod) as unknown as VerovioToolkitLike;
	})();
	return verovioPromise;
}

// Runs inside Playwright via toString(), so it stays self-contained.
function osmdGeometryCapture({ osmd, container }: OsmdContext): {
	measures: { index: number; system: number; x: number; w: number }[];
	staves: {
		flatStaff: number;
		measure: number;
		lines: number[];
		x: number;
		w: number;
	}[];
} {
	type Box = {
		AbsolutePosition: { x: number; y: number };
		BorderLeft: number;
		BorderRight: number;
	};
	type Measure = {
		PositionAndShape: Box;
		ParentStaffLine: { StaffHeight: number };
		ParentStaff?: { StafflineCount?: number };
		parentSourceMeasure: { measureListIndex: number };
	};
	const live = osmd as unknown as {
		Zoom: number;
		GraphicSheet: { MeasureList: Array<Array<Measure | undefined>> };
	};
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const svg = container.querySelector('svg')?.getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	const unit = 10 * live.Zoom;
	const dx = (svg?.x ?? 0) - (origin?.x ?? 0);
	const dy = (svg?.y ?? 0) - (origin?.y ?? 0);

	const measures: { index: number; system: number; x: number; w: number }[] =
		[];
	const staves: {
		flatStaff: number;
		measure: number;
		lines: number[];
		x: number;
		w: number;
	}[] = [];

	for (const staffList of live.GraphicSheet.MeasureList) {
		let minX = Infinity;
		let maxX = -Infinity;
		let measureIdx = -1;
		for (let flatStaff = 0; flatStaff < staffList.length; flatStaff++) {
			const measure = staffList[flatStaff];
			if (!measure) {
				continue;
			}
			measureIdx = measure.parentSourceMeasure.measureListIndex;
			const box = measure.PositionAndShape;
			const left =
				(dx + (box.AbsolutePosition.x + box.BorderLeft) * unit) * ratio;
			const width = (box.BorderRight - box.BorderLeft) * unit * ratio;
			const top = (dy + box.AbsolutePosition.y * unit) * ratio;
			const staffHeight = measure.ParentStaffLine.StaffHeight * unit * ratio;
			const lineCount = Math.max(2, measure.ParentStaff?.StafflineCount ?? 5);
			const lines: number[] = [];
			for (let i = 0; i < lineCount; i++) {
				lines.push(top + (i * staffHeight) / (lineCount - 1));
			}
			minX = Math.min(minX, left);
			maxX = Math.max(maxX, left + width);
			staves.push({ flatStaff, measure: measureIdx, lines, x: left, w: width });
		}
		if (measureIdx >= 0 && Number.isFinite(minX) && maxX > minX) {
			measures.push({ index: measureIdx, system: 0, x: minX, w: maxX - minX });
		}
	}
	return { measures, staves };
}
