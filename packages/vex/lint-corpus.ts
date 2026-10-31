// vet-ignore-file compact-files: came in at this size from the upstream repository; splitting it is a refactor of its own
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { InkMask } from '@vexml/renderer';
import { Rect } from 'core/geometry';
import { PNG } from 'pngjs';
import { InkMap } from './ink-map';
import { FINDING_KINDS, type FindingKind, RenderLint } from './render-lint';
import { StaffDetector } from './staff-detector';

/**
 * The lint's test suite: renders known to be clean, renders known to be wrong and where,
 * and how well the lint tells them apart. The clean set is every fixture's screenshot
 * baseline, plus each defect's fixed render; any finding there is a false positive. The
 * defects come from commits that fixed one (the baseline before and after the commit, the
 * pixels it changed as the box), and from edits of clean baselines for the kinds history
 * never fixed. A defect counts as found when the lint names its kind, and as localized
 * when that finding's box overlaps the defect's.
 */
export class LintCorpus {
	constructor(private readonly paths: CorpusPaths) {}

	score(): CorpusScore {
		const defects = this.defects();
		const kinds = new Map<DefectKind, KindScore>(
			[...FINDING_KINDS, 'collision' as const].map((kind) => [
				kind,
				{ kind, defects: 0, found: 0, localized: 0, falsePositives: 0 },
			]),
		);
		const misses: Miss[] = [];
		const caught: string[] = [];
		for (const defect of defects) {
			const score = kinds.get(defect.kind) as KindScore;
			score.defects++;
			const findings = new RenderLint(InkMap.fromPng(defect.png), defect.masks)
				.lint()
				.findings.filter((finding) => finding.kind === defect.kind);
			const box = new Rect(
				defect.box.x,
				defect.box.y,
				defect.box.w,
				defect.box.h,
			);
			const found = findings.length > 0;
			const localized = findings.some((finding) => finding.box.intersects(box));
			score.found += Number(found);
			score.localized += Number(localized);
			// Only a kind the lint names can be held to; the rest are its backlog.
			if (defect.missed) {
				if (localized) {
					caught.push(defect.id);
				}
			} else if (isFindingKind(defect.kind) && !localized) {
				misses.push({
					id: defect.id,
					kind: defect.kind,
					reason: found ? 'elsewhere' : 'unfound',
				});
			}
		}

		const known = this.json<KnownFalsePositives>('clean.json');
		const surprises: Surprise[] = [];
		const clean = this.clean();
		for (const { screenshot, png, masks } of clean) {
			const counts: Partial<Record<FindingKind, number>> = {};
			for (const finding of new RenderLint(InkMap.fromPng(png), masks).lint()
				.findings) {
				counts[finding.kind] = (counts[finding.kind] ?? 0) + 1;
			}
			for (const kind of FINDING_KINDS) {
				const count = counts[kind] ?? 0;
				(kinds.get(kind) as KindScore).falsePositives += count;
				const allowed = known[screenshot]?.[kind] ?? 0;
				if (count > allowed) {
					surprises.push({ screenshot, kind, count, known: allowed });
				}
			}
		}
		return {
			kinds: [...kinds.values()],
			clean: clean.length,
			maskClean: clean.filter((item) => item.masks !== undefined).length,
			maskDefects: defects.filter((item) => item.masks !== undefined).length,
			misses,
			caught,
			surprises,
		};
	}

	/** Every defect with the render that has it. */
	defects(): Array<{
		id: string;
		kind: DefectKind;
		box: Box;
		png: Buffer;
		masks?: InkMask[];
		missed?: boolean;
	}> {
		const history = this.json<DefectLabel[]>('defects.json').map((label) => ({
			id: label.id,
			missed: label.missed,
			masks: this.masks(
				join(this.paths.corpus, 'defects', `${label.id}.before.png`),
			),
			kind: label.kind,
			box: label.box,
			png: readFileSync(
				join(this.paths.corpus, 'defects', `${label.id}.before.png`),
			),
		}));
		const synthetic = this.json<SyntheticSpec[]>('synthetic.json').map(
			(spec) => ({
				id: `${stemOf(spec.screenshot)} ${describeEdit(spec.edit)}`,
				missed: spec.missed,
				...applyEdit(
					readFileSync(join(this.paths.screenshots, spec.screenshot)),
					spec.edit,
				),
			}),
		);
		return [...history, ...synthetic];
	}

	/** Every render known to be right: each fixture's baseline and each defect's fix. */
	clean(): Array<{ screenshot: string; png: Buffer; masks?: InkMask[] }> {
		const baselines = readdirSync(this.paths.fixtures)
			.filter((file) => file.endsWith('.musicxml'))
			.map((file) => `${stemOf(file)}.png`)
			.filter((png) => existsSync(join(this.paths.screenshots, png)))
			.sort()
			.map((screenshot) => ({
				screenshot,
				png: readFileSync(join(this.paths.screenshots, screenshot)),
			}));
		const fixed = this.json<DefectLabel[]>('defects.json').map((label) => {
			const screenshot = `${label.id}.after.png`;
			return {
				screenshot,
				masks: this.masks(join(this.paths.corpus, 'defects', screenshot)),
				png: readFileSync(join(this.paths.corpus, 'defects', screenshot)),
			};
		});
		const dir = join(this.paths.corpus, 'clean-masks');
		const captured = existsSync(dir)
			? readdirSync(dir)
					.filter((file) => file.endsWith('.json.gz'))
					.sort()
					.map((file) => {
						const { png, masks } = JSON.parse(
							gunzipSync(readFileSync(join(dir, file))).toString(),
						) as { png: string; masks: InkMask[] };
						return {
							screenshot: file.replace(/\.musicxml\.json\.gz$/, '.ink.png'),
							png: Buffer.from(png, 'base64'),
							masks,
						};
					})
			: [];
		return [...baselines, ...fixed, ...captured];
	}

	private masks(png: string): InkMask[] | undefined {
		const path = `${png}.masks.json.gz`;
		if (!existsSync(path)) {
			return undefined;
		}
		const capture = JSON.parse(gunzipSync(readFileSync(path)).toString()) as {
			pngHash: string;
			masks: InkMask[];
		};
		if (
			capture.pngHash !==
			createHash('sha256').update(readFileSync(png)).digest('hex')
		) {
			throw new Error(`stale ink masks for ${png}; rebuild the corpus capture`);
		}
		return capture.masks;
	}

	private json<T>(file: string): T {
		return JSON.parse(readFileSync(join(this.paths.corpus, file), 'utf8')) as T;
	}
}

/** What is wrong with a defect: a kind the lint names, or one it has no check for yet,
 * which the corpus still counts so recall shows what the lint misses. */
export type DefectKind = FindingKind | 'collision';

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** A render a commit fixed: `<id>.before.png` has the defect, `<id>.after.png` the fix. */
export interface DefectLabel {
	/** Both sides were rendered from this revision's identical fixture. */
	inputCommit?: string;
	/** Counts against recall until captured ink detects it. */
	missed?: boolean;
	missedReason?: string;
	id: string;
	kind: DefectKind;
	/* The screenshot baseline the commit changed. */
	screenshot: string;
	commit: string;
	/* The commit's subject: what it fixed, in its author's words. */
	note: string;
	/* Every pixel the fix changed: the defect and where it went. */
	box: Box;
}

/** A defect made by editing a clean baseline, for the kinds history never fixed. */
export interface SyntheticSpec {
	screenshot: string;
	edit: Edit;
	/* The lint is known to miss it: it counts against recall without failing the check,
	 * until the lint finds it and the flag goes. */
	missed?: boolean;
}

export type Edit =
	/* Cut the canvas 10px into the ink on one side. */
	| { crop: 'top' | 'bottom' | 'left' | 'right' }
	/* Pull the nth staff (from 1) up to `gap` staff spaces (0.5 by default) under the one
	 * above it; a negative gap draws it into that staff. */
	| { squeeze: number; gap?: number }
	| { line: true }
	| { blank: true };

/* Per screenshot, how many findings of each kind are known false positives. */
export type KnownFalsePositives = Record<
	string,
	Partial<Record<FindingKind, number>>
>;

export interface KindScore {
	kind: DefectKind;
	defects: number;
	found: number;
	localized: number;
	falsePositives: number;
}

/** A defect the lint should have found where it is, and didn't. */
export interface Miss {
	id: string;
	kind: DefectKind;
	reason: 'unfound' | 'elsewhere';
}

/** A clean render with more findings of a kind than are known. */
export interface Surprise {
	screenshot: string;
	kind: FindingKind;
	count: number;
	known: number;
}

export interface CorpusScore {
	kinds: KindScore[];
	clean: number;
	maskClean: number;
	maskDefects: number;
	misses: Miss[];
	/* Defects marked missed that the lint now finds where they are. */
	caught: string[];
	surprises: Surprise[];
}

export interface CorpusPaths {
	/* The corpus: defects.json, synthetic.json, clean.json and defects/*.png. */
	corpus: string;
	fixtures: string;
	screenshots: string;
}

/** The score as a table, one row per kind, then what failed the check. */
export function formatScore(score: CorpusScore): string[] {
	const percent = (n: number, d: number) =>
		d === 0 ? '-' : `${Math.round((100 * n) / d)}%`;
	const rows = [
		[
			'kind',
			'defects',
			'found',
			'localized',
			'false+',
			'precision',
			'recall',
			'hit rate',
		],
		...score.kinds.map((k) => [
			k.kind,
			String(k.defects),
			String(k.found),
			String(k.localized),
			String(k.falsePositives),
			percent(k.found, k.found + k.falsePositives),
			percent(k.found, k.defects),
			percent(k.localized, k.found),
		]),
	];
	const widths =
		rows[0]?.map((_, i) =>
			Math.max(...rows.map((row) => row[i]?.length ?? 0)),
		) ?? [];
	const lines = rows.map((row) =>
		row
			.map((cell, i) => cell.padEnd(widths[i] ?? 0))
			.join('  ')
			.trimEnd(),
	);
	lines.push(
		`${score.clean} clean renders; masks for ${score.maskClean} clean renders and ${score.maskDefects} defects`,
	);
	for (const miss of score.misses) {
		lines.push(
			miss.reason === 'unfound'
				? `missed ${miss.id}: no ${miss.kind} finding`
				: `missed ${miss.id}: a ${miss.kind} finding, but not where the defect is`,
		);
	}
	for (const id of score.caught) {
		lines.push(`now found ${id}: drop its missed flag in the corpus labels`);
	}
	for (const s of score.surprises) {
		lines.push(
			`new false positive in ${s.screenshot}: ${s.count} ${s.kind} where ${s.known} known`,
		);
	}
	return lines;
}

export interface AddDefectOptions {
	corpus: string;
	commit: string;
	screenshot: string;
	kind: DefectKind;
}

/**
 * Adds the defect a commit fixed in one screenshot baseline: the baseline before and
 * after, and the pixels the commit changed as where the defect is. Both sides must be the
 * same size, or the change can't be placed.
 */
export function addDefect(opts: AddDefectOptions): DefectLabel {
	const git = (...args: string[]) =>
		execFileSync('git', args, { maxBuffer: 1 << 28 });
	const commit = git('rev-parse', '--short', opts.commit).toString().trim();
	const path = git('show', '--name-only', '--format=', commit)
		.toString()
		.split('\n')
		.find((file) => basename(file) === opts.screenshot);
	if (!path) {
		throw new Error(`${commit} does not change ${opts.screenshot}`);
	}
	const before = git('show', `${commit}^:${path}`);
	const after = git('show', `${commit}:${path}`);
	const box = changedBox(InkMap.fromPng(before), InkMap.fromPng(after));
	if (!box) {
		throw new Error(`${commit} changes no ink in ${opts.screenshot}`);
	}

	const label: DefectLabel = {
		missed: opts.kind === 'collision' ? true : undefined,
		id: `${commit}-${stemOf(opts.screenshot)}`,
		kind: opts.kind,
		screenshot: opts.screenshot,
		commit,
		note: git('log', '-1', '--format=%s', commit).toString().trim(),
		box,
	};
	for (const side of ['before', 'after']) {
		rmSync(
			join(opts.corpus, 'defects', `${label.id}.${side}.png.masks.json.gz`),
			{ force: true },
		);
	}
	writeFileSync(join(opts.corpus, 'defects', `${label.id}.before.png`), before);
	writeFileSync(join(opts.corpus, 'defects', `${label.id}.after.png`), after);
	const file = join(opts.corpus, 'defects.json');
	const labels = (
		JSON.parse(readFileSync(file, 'utf8')) as DefectLabel[]
	).filter((other) => other.id !== label.id);
	labels.push(label);
	labels.sort((a, b) => a.id.localeCompare(b.id));
	writeFileSync(file, `${JSON.stringify(labels, null, '\t')}\n`);
	return label;
}

function changedBox(a: InkMap, b: InkMap): Box | null {
	if (a.width !== b.width || a.height !== b.height) {
		throw new Error(
			`the render changed size (${a.width}x${a.height} to ${b.width}x${b.height}), so the change can't be placed`,
		);
	}
	let left = Infinity;
	let top = Infinity;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < a.height; y++) {
		for (let x = 0; x < a.width; x++) {
			if (a.isInk(x, y) !== b.isInk(x, y)) {
				left = Math.min(left, x);
				top = Math.min(top, y);
				right = Math.max(right, x);
				bottom = Math.max(bottom, y);
			}
		}
	}
	return right < 0
		? null
		: { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

// Each edit makes one kind of defect, and knows where it put it.
function applyEdit(
	png: Buffer,
	edit: Edit,
): { kind: FindingKind; box: Box; png: Buffer } {
	const image = PNG.sync.read(png);
	if ('blank' in edit) {
		const background = image.data.subarray(0, 4);
		for (let at = 0; at < image.data.length; at += 4) {
			image.data.set(background, at);
		}
		return {
			kind: 'blank',
			box: { x: 0, y: 0, w: image.width, h: image.height },
			png: PNG.sync.write(image),
		};
	}
	const ink = InkMap.fromPng(png);
	if ('crop' in edit) {
		return crop(image, ink, edit.crop);
	}
	if ('line' in edit) {
		return strayLine(image, ink);
	}
	return squeeze(image, ink, edit.squeeze, edit.gap ?? 0.5);
}

// Lay a line, inked like the staff's own, across the first staff half a space above it.
function strayLine(
	image: PNG,
	ink: InkMap,
): { kind: FindingKind; box: Box; png: Buffer } {
	const staff = new StaffDetector(ink)
		.groups()
		.find((group) => group.lines.length >= 3);
	const first = staff?.lines[0];
	if (!staff || !first) {
		throw new Error('no staff to lay a line above');
	}
	const space = staff.box.h / (staff.lines.length - 1);
	const y = Math.round(first.y - space / 2);
	const at = (x: number, row: number) => (row * image.width + x) * 4;
	const stroke = image.data.subarray(
		at(Math.round(first.start) + 1, Math.round(first.y)),
		at(Math.round(first.start) + 1, Math.round(first.y)) + 4,
	);
	for (let x = Math.round(first.start); x <= Math.round(first.end); x++) {
		image.data.set(stroke, at(x, y));
	}
	return {
		kind: 'stray-line',
		box: { x: first.start, y, w: first.end - first.start, h: 1 },
		png: PNG.sync.write(image),
	};
}

// Cut the canvas a little way into the ink, so the ink now runs off that edge.
function crop(
	image: PNG,
	ink: InkMap,
	side: 'top' | 'bottom' | 'left' | 'right',
): { kind: FindingKind; box: Box; png: Buffer } {
	// The edge goes CUT pixels into the ink, then on to the first line that has ink on it:
	// a cut through the gap between a title and the music clips nothing.
	const bounds = inkBounds(ink);
	const inked = (at: number) =>
		(side === 'top' || side === 'bottom' ? ink.rowRuns(at) : ink.columnRuns(at))
			.length > 0;
	const inward = side === 'top' || side === 'left' ? 1 : -1;
	let at = {
		top: bounds.top + CUT,
		bottom: bounds.bottom - 1 - CUT,
		left: bounds.left + CUT,
		right: bounds.right - 1 - CUT,
	}[side];
	while (!inked(at)) {
		at += inward;
	}
	const keep = {
		top: new Rect(0, at, image.width, image.height - at),
		bottom: new Rect(0, 0, image.width, at + 1),
		left: new Rect(at, 0, image.width - at, image.height),
		right: new Rect(0, 0, at + 1, image.height),
	}[side];
	const out = new PNG({ width: keep.w, height: keep.h });
	PNG.bitblt(image, out, keep.x, keep.y, keep.w, keep.h, 0, 0);
	const edge: Record<typeof side, Box> = {
		top: { x: 0, y: 0, w: keep.w, h: 1 },
		bottom: { x: 0, y: keep.h - 1, w: keep.w, h: 1 },
		left: { x: 0, y: 0, w: 1, h: keep.h },
		right: { x: keep.w - 1, y: 0, w: 1, h: keep.h },
	};
	return { kind: 'clipped', box: edge[side], png: PNG.sync.write(out) };
}

// Lift everything below the middle of the gap above the nth staff, so that staff ends up
// half a staff space under the one above it. Lifted ink is laid over what was there, as a
// renderer drawing into the wrong place would.
function squeeze(
	image: PNG,
	ink: InkMap,
	nth: number,
	spaces: number,
): { kind: FindingKind; box: Box; png: Buffer } {
	const staves = new StaffDetector(ink)
		.groups()
		.filter((group) => group.lines.length >= 3);
	const upper = staves[nth - 1];
	const lower = staves[nth];
	if (!upper || !lower) {
		throw new Error(`no staff ${nth} under another to squeeze`);
	}
	const space = upper.box.h / (upper.lines.length - 1);
	const gap = lower.box.top - upper.box.bottom;
	const lift = Math.round(gap - space * spaces);
	const from = Math.round(upper.box.bottom + gap / 2);

	const { width, height, data } = image;
	const background = data.subarray(0, 4);
	const row = (y: number) => data.subarray(y * width * 4, (y + 1) * width * 4);
	for (let y = from; y < height; y++) {
		const source = Uint8Array.from(row(y));
		const target = row(y - lift);
		for (let at = 0; at < source.length; at += 4) {
			if (y - lift >= from || ink.isInk(at / 4, y)) {
				target.set(source.subarray(at, at + 4), at);
			}
		}
	}
	for (let y = height - lift; y < height; y++) {
		for (let at = 0; at < width * 4; at += 4) {
			row(y).set(background, at);
		}
	}
	const box = upper.box.union(lower.box.translate(0, -lift));
	return {
		kind: 'staves-collide',
		box: { x: box.x, y: box.y, w: box.w, h: box.h },
		png: PNG.sync.write(image),
	};
}

// How far into the ink a crop cuts.
const CUT = 10;

function inkBounds(ink: InkMap): Rect {
	let left = Infinity;
	let top = Infinity;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < ink.height; y++) {
		for (let x = 0; x < ink.width; x++) {
			if (ink.isInk(x, y)) {
				left = Math.min(left, x);
				top = Math.min(top, y);
				right = Math.max(right, x + 1);
				bottom = Math.max(bottom, y + 1);
			}
		}
	}
	return new Rect(left, top, right - left, bottom - top);
}

function describeEdit(edit: Edit): string {
	if ('blank' in edit) {
		return 'blanked';
	}
	if ('line' in edit) {
		return 'line laid above the staff';
	}
	if ('crop' in edit) {
		return `cropped ${edit.crop}`;
	}
	return `staff ${edit.squeeze} squeezed to ${edit.gap ?? 0.5} spaces`;
}

function isFindingKind(kind: DefectKind): kind is FindingKind {
	return (FINDING_KINDS as readonly string[]).includes(kind);
}

function stemOf(file: string): string {
	return basename(file, extname(file));
}
