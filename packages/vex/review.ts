import * as path from 'node:path';
import type { Fs } from 'core/system';
import { PNG } from 'pngjs';
import { z } from 'zod';
import {
	type AgentMark,
	isNewEntry,
	PANELS,
	type Panel,
	type ReviewData,
	type ReviewEntry,
	type ReviewGuide,
} from './review-data';
import { withRuleNote } from './rule-notes';

/** Where `vex test` leaves a composite and its `.json` for each snapshot that moved. */
export const DIFFS_DIR = 'packages/integration/__diffs__';
/** Where engraving checks leave `<snapshot>.marks.json` overlays. */
export const MARKS_DIR = 'packages/integration/__marks__';
const SCREENSHOTS_DIR = 'packages/integration/__screenshots__';
const INTEGRATION_DIR = 'packages/integration';

// The caption strip over the composite's panels (see integration/screenshot.ts).
const HEADER = 32;

/** A snapshot collected for review: 3 panels when moved, `after` alone when new. */
export interface MovedSnapshot {
	entry: Omit<ReviewEntry, 'images' | 'scale'>;
	panels: Partial<Record<Panel, PNG>> & { after: PNG };
}

export interface CollectOptions {
	/** Snapshot filenames (e.g. `engraving_foo.png`) that are new in this change. */
	newSnapshots?: string[];
	/** Rule notes by snapshot (`readRuleNotes`), shown for snapshots already in the review. */
	ruleNotes?: Map<string, string>;
}

// What integration/screenshot.ts writes beside a diff. The layout is the renderer's
// ScoreLayout, taken as written.
const sidecarSchema = z.object({
	test: z.string().nullable().catch(null),
	line: z.number().nullable().catch(null),
	mismatch: z.number().optional(),
	layout: z.any().optional(),
});

const markPointSchema = z.object({ x: z.number(), y: z.number() });
const agentMarkSchema = z.object({
	kind: z.enum(['bracket', 'line', 'box']),
	role: z.enum(['measure', 'reference']),
	from: markPointSchema,
	to: markPointSchema,
	label: z.string(),
	note: z.string().optional(),
	pass: z.boolean().optional(),
});
const marksFileSchema = z.object({
	screenshot: z.string(),
	width: z.number(),
	height: z.number(),
	marks: z.array(agentMarkSchema),
});

/**
 * The snapshots for `vex review`, read from vexml/: moved diffs from `__diffs__/`,
 * newly added or explicitly claimed baselines from `__screenshots__/`, and any matching
 * agent marks from `__marks__/`.
 */
export class Diffs {
	constructor(private readonly fs: Fs) {}

	/** Every moved, new, or claimed snapshot, with its agent marks and parsed notes. */
	async collect(
		claimsText = '',
		opts: CollectOptions = {},
	): Promise<MovedSnapshot[]> {
		const fs = this.fs;
		const claims = parseClaims(claimsText);
		const marksBySnapshot = await this.loadMarks();
		const hasDiffsDir = await fs.exists(DIFFS_DIR);
		const diffNames = hasDiffsDir
			? (await fs.readdir(DIFFS_DIR))
					.filter((name) => name.endsWith('.png'))
					.sort()
			: [];
		const diffSet = new Set(diffNames);

		// Include newly added baselines and baselines explicitly named in `--claims`.
		const candidateNew = new Set<string>();
		for (const name of opts.newSnapshots ?? []) {
			const normalized = normalizePng(name);
			if (!diffSet.has(normalized)) {
				candidateNew.add(normalized);
			}
		}
		for (const name of claims.keys()) {
			const normalized = normalizePng(name);
			if (!diffSet.has(normalized)) {
				candidateNew.add(normalized);
			}
		}

		const newNames: string[] = [];
		for (const name of [...candidateNew].sort()) {
			if (await fs.exists(path.join(SCREENSHOTS_DIR, name))) {
				newNames.push(name);
			}
		}

		if (diffNames.length === 0 && newNames.length === 0) {
			if (!hasDiffsDir) {
				throw new Error(
					`no diffs: run \`vex test\` first (${DIFFS_DIR} is missing)`,
				);
			}
			throw new Error(
				`no snapshot moved: ${DIFFS_DIR} holds no diffs and no new screenshots were found`,
			);
		}

		const collected: MovedSnapshot[] = [];

		for (const name of diffNames) {
			const composite = PNG.sync.read(
				Buffer.from(await fs.readBytes(path.join(DIFFS_DIR, name))),
			);
			const panels = split(composite);
			const { width, height } = panels.before;
			const sidecar = await this.sidecar(name);
			const changed = sidecar?.mismatch ?? countChanged(panels.diff);
			const rawNote = withRuleNote(
				claims.get(name) ?? claims.get(name.replace(/\.png$/, '')),
				opts.ruleNotes?.get(name),
			);
			const { claim, guide } = parseSnapshotNotes(rawNote);
			const agentMarks = marksBySnapshot.get(name);
			collected.push({
				entry: {
					name,
					kind: 'moved',
					test: sidecar?.test ?? null,
					line: sidecar?.line ?? null,
					fixture: sidecar?.test
						? await this.fixtureOf(sidecar.test, sidecar.line)
						: null,
					changed,
					share: changed / (width * height),
					width,
					height,
					claim,
					...(guide ? { guide } : {}),
					...(agentMarks ? { agentMarks } : {}),
					layout: sidecar?.layout ?? null,
				},
				panels,
			});
		}

		for (const name of newNames) {
			const after = PNG.sync.read(
				Buffer.from(await fs.readBytes(path.join(SCREENSHOTS_DIR, name))),
			);
			const loc = await this.locateSnapshotTest(name);
			const rawNote = withRuleNote(
				claims.get(name) ?? claims.get(name.replace(/\.png$/, '')),
				opts.ruleNotes?.get(name),
			);
			const { claim, guide } = parseSnapshotNotes(rawNote);
			const agentMarks = marksBySnapshot.get(name);
			collected.push({
				entry: {
					name,
					kind: 'new',
					test: loc?.test ?? null,
					line: loc?.line ?? null,
					fixture: loc?.test ? await this.fixtureOf(loc.test, loc.line) : null,
					changed: 0,
					share: 0,
					width: after.width,
					height: after.height,
					claim,
					...(guide ? { guide } : {}),
					...(agentMarks ? { agentMarks } : {}),
					layout: null,
				},
				panels: { after },
			});
		}

		return collected.sort((a, b) => {
			const aFail = hasFailingMark(a.entry.agentMarks) ? 1 : 0;
			const bFail = hasFailingMark(b.entry.agentMarks) ? 1 : 0;
			if (aFail !== bFail) {
				return bFail - aFail;
			}
			const aNew = isNewEntry(a.entry) ? 1 : 0;
			const bNew = isNewEntry(b.entry) ? 1 : 0;
			if (aNew !== bNew) {
				return aNew - bNew;
			}
			if (!isNewEntry(a.entry)) {
				return b.entry.share - a.entry.share;
			}
			return a.entry.name.localeCompare(b.entry.name);
		});
	}

	/** How many baselines still match: every baseline outside this review's snapshots. */
	async unchanged(reviewed: number): Promise<number | null> {
		const fs = this.fs;
		if (!(await fs.exists(SCREENSHOTS_DIR))) {
			return null;
		}
		const baselines = (await fs.readdir(SCREENSHOTS_DIR)).filter((name) =>
			name.endsWith('.png'),
		);
		return Math.max(0, baselines.length - reviewed);
	}

	/**
	 * The fixture a test renders, read from its source: the first fixture file named
	 * between the start of the test (`it(` or `test(`) the line falls in and that line.
	 */
	async fixtureOf(test: string, line: number | null): Promise<string | null> {
		const fs = this.fs;
		const file = path.join(INTEGRATION_DIR, test);
		if (line === null || !(await fs.exists(file))) {
			return null;
		}
		const lines = (await fs.read(file)).split('\n').slice(0, line);
		let start = 0;
		for (let i = lines.length - 1; i >= 0; i--) {
			if (/\b(it|test)(\.\w+)*\(/.test(lines[i] ?? '')) {
				start = i;
				break;
			}
		}
		const body = lines.slice(start).join('\n');
		const explicit = /['"`]([\w./-]+\.(?:musicxml|mxl|xml))['"`]/.exec(
			body,
		)?.[1];
		if (explicit) {
			return explicit;
		}
		const engravingRule = /\b(?:draw|engrave)\(\s*['"`]([\w./-]+)['"`]/.exec(
			body,
		)?.[1];
		return engravingRule ? `engraving/${engravingRule}.musicxml` : null;
	}

	/** Reads every valid `*.marks.json` in `__marks__/`, keyed by screenshot filename. */
	private async loadMarks(): Promise<Map<string, AgentMark[]>> {
		const fs = this.fs;
		const bySnapshot = new Map<string, AgentMark[]>();
		const files = (await readdirOrEmpty(fs, MARKS_DIR))
			.filter((name) => name.endsWith('.marks.json'))
			.sort();
		for (const file of files) {
			try {
				const parsed = marksFileSchema.safeParse(
					JSON.parse(await fs.read(path.join(MARKS_DIR, file))),
				);
				if (parsed.success && parsed.data.marks.length > 0) {
					bySnapshot.set(parsed.data.screenshot, parsed.data.marks);
				}
			} catch {
				// Ignore malformed mark files rather than breaking the whole review.
			}
		}
		return bySnapshot;
	}

	/** Finds the integration test file and 1-based line referencing `toMatchScreenshot('<name>')`. */
	private async locateSnapshotTest(
		name: string,
	): Promise<{ test: string; line: number } | null> {
		const fs = this.fs;
		const files = (await readdirOrEmpty(fs, INTEGRATION_DIR))
			.filter((f) => f.endsWith('.test.ts'))
			.sort();
		for (const file of files) {
			const text = await fs.read(path.join(INTEGRATION_DIR, file));
			if (!text.includes(name)) {
				continue;
			}
			const lines = text.split('\n');
			for (let i = 0; i < lines.length; i++) {
				if (lines[i]?.includes(name)) {
					return { test: file, line: i + 1 };
				}
			}
		}
		return null;
	}

	private async sidecar(name: string) {
		const fs = this.fs;
		const file = path.join(DIFFS_DIR, name.replace(/\.png$/, '.json'));
		if (!(await fs.exists(file))) {
			return null;
		}
		const parsed = sidecarSchema.safeParse(JSON.parse(await fs.read(file)));
		return parsed.success ? parsed.data : null;
	}
}

/** The composite's [old][diff][new] panels, cut apart below the captions. */
export function split(composite: PNG): Record<Panel, PNG> {
	const width = Math.floor(composite.width / 3);
	const height = composite.height - HEADER;
	const panels = {} as Record<Panel, PNG>;
	PANELS.forEach((panel, i) => {
		const png = new PNG({ width, height });
		PNG.bitblt(composite, png, i * width, HEADER, width, height, 0, 0);
		panels[panel] = png;
	});
	return panels;
}

/** The pixels pixelmatch painted its diff red on, for a diff with no `.json` beside it. */
export function countChanged(diff: PNG): number {
	let count = 0;
	for (let i = 0; i < diff.data.length; i += 4) {
		if (
			diff.data[i] === 255 &&
			diff.data[i + 1] === 0 &&
			diff.data[i + 2] === 0
		) {
			count++;
		}
	}
	return count;
}

/** The PNG shrunk by `scale` (0..1], each pixel the average of those it covers. */
export function downscale(png: PNG, scale: number): PNG {
	if (scale >= 1) {
		return png;
	}
	const width = Math.max(1, Math.round(png.width * scale));
	const height = Math.max(1, Math.round(png.height * scale));
	const out = new PNG({ width, height });
	const step = 1 / scale;
	for (let y = 0; y < height; y++) {
		const y0 = Math.floor(y * step);
		const y1 = Math.min(
			png.height,
			Math.max(y0 + 1, Math.floor((y + 1) * step)),
		);
		for (let x = 0; x < width; x++) {
			const x0 = Math.floor(x * step);
			const x1 = Math.min(
				png.width,
				Math.max(x0 + 1, Math.floor((x + 1) * step)),
			);
			const sum = [0, 0, 0, 0];
			for (let sy = y0; sy < y1; sy++) {
				for (let sx = x0; sx < x1; sx++) {
					const at = (sy * png.width + sx) * 4;
					for (let c = 0; c < 4; c++) {
						sum[c] = (sum[c] ?? 0) + (png.data[at + c] ?? 0);
					}
				}
			}
			const count = (y1 - y0) * (x1 - x0);
			const at = (y * width + x) * 4;
			for (let c = 0; c < 4; c++) {
				out.data[at + c] = Math.round((sum[c] ?? 0) / count);
			}
		}
	}
	return out;
}

/** `## <snapshot>` sections of the claims file, by snapshot, each section's markdown. */
export function parseClaims(text: string): Map<string, string> {
	const claims = new Map<string, string>();
	const sections = text.split(/^## +(.+)$/m);
	for (let i = 1; i < sections.length; i += 2) {
		const name = (sections[i] ?? '').trim().replace(/^`|`$/g, '');
		const body = (sections[i + 1] ?? '').trim();
		if (name && body) {
			claims.set(name, body);
		}
	}
	return claims;
}

const GUIDE_HEADINGS: Record<string, keyof ReviewGuide> = {
	rule: 'rule',
	'the rule': 'rule',
	'test case': 'testCase',
	'the test case': 'testCase',
	'look for': 'lookFor',
	'what to look for': 'lookFor',
	found: 'found',
	'what was found': 'found',
	'what we found': 'found',
};

/**
 * Splits a snapshot's markdown section into an optional plain `claim` and an optional
 * structured four-part `guide` (`### The rule`, `### The test case`, `### What to look for`,
 * `### What was found`), each rendered to HTML.
 */
export function parseSnapshotNotes(markdown: string | undefined): {
	claim: string | null;
	guide: ReviewGuide | null;
} {
	if (!markdown?.trim()) {
		return { claim: null, guide: null };
	}
	const parts = markdown.split(/^### +(.+)$/m);
	const claimChunks: string[] = [];
	const lead = (parts[0] ?? '').trim();
	if (lead) {
		claimChunks.push(lead);
	}
	const guide: ReviewGuide = {
		rule: null,
		testCase: null,
		lookFor: null,
		found: null,
	};
	let hasGuide = false;
	for (let i = 1; i < parts.length; i += 2) {
		const rawHeading = (parts[i] ?? '').trim();
		const body = (parts[i + 1] ?? '').trim();
		const normalized = rawHeading
			.replace(/^\d+[.)]\s*/, '')
			.replace(/:$/, '')
			.trim()
			.toLowerCase();
		const field = GUIDE_HEADINGS[normalized];
		if (field && body) {
			guide[field] = markdownHtml(body);
			hasGuide = true;
		} else if (body) {
			claimChunks.push(`### ${rawHeading}\n\n${body}`);
		}
	}
	if (!hasGuide) {
		return { claim: markdownHtml(markdown.trim()), guide: null };
	}
	const claimText = claimChunks.join('\n\n').trim();
	return {
		claim: claimText ? markdownHtml(claimText) : null,
		guide,
	};
}

export function markdownHtml(text: string): string {
	return Bun.markdown.html(text);
}

/** The page's data, the images named by `image`. */
export function reviewData(opts: ReviewDataOptions): ReviewData {
	return {
		id: opts.id,
		version: opts.version,
		title: opts.title,
		tradeoffs: opts.tradeoffs ? markdownHtml(opts.tradeoffs) : null,
		unchanged: opts.unchanged,
		mode: opts.mode,
		entries: opts.moved.map(({ entry }) => {
			const panels: Panel[] = isNewEntry(entry) ? ['after'] : [...PANELS];
			const images = Object.fromEntries(
				panels.map((panel) => [panel, opts.image(entry.name, panel)]),
			) as Partial<Record<Panel, string>> & { after: string };
			return {
				...entry,
				scale: opts.scale?.(entry) ?? 1,
				images,
			};
		}),
	};
}

export interface ReviewDataOptions {
	id: string;
	version: number;
	title: string;
	tradeoffs: string | null;
	unchanged: number | null;
	moved: MovedSnapshot[];
	mode: ReviewData['mode'];
	image: (name: string, panel: Panel) => string;
	scale?: (entry: MovedSnapshot['entry']) => number;
}

function normalizePng(name: string): string {
	const base = path.basename(name.trim());
	return base.endsWith('.png') ? base : `${base}.png`;
}

async function readdirOrEmpty(fs: Fs, dir: string): Promise<string[]> {
	try {
		return await fs.readdir(dir);
	} catch {
		return [];
	}
}

function hasFailingMark(marks: AgentMark[] | undefined): boolean {
	return (marks ?? []).some((m) => m.role === 'measure' && m.pass === false);
}
