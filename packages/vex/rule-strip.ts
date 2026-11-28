// `vex rules strip`: one clean PNG comparing a Behind Bars rule's checks across the book,
// vexml (without and with a fix, or as it stands) and the reference renderers, every
// tile scaled to one staff-space size, for an agent to attach as evidence. No agent marks.
// With answer groups, tiles stack under one lettered heading per group, matching a review
// question's choices, so the reviewer picks a look rather than a renderer.

import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { renderers } from '@vexml/renderer';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';
import { PNG } from 'pngjs';
import { parseRenderGeometry, readGeometry } from './render-geometry';
import { BookCropper, resolveBookDir } from './rule-book';
import {
	cropRect,
	parseRuleChecks,
	type RenderGeometry,
	type RuleCheck,
} from './rule-checks';
import { ruleSnapshot } from './rule-notes';
import {
	RuleReferenceCache,
	resolveRuleReferenceCacheDir,
} from './rule-references';
import {
	ENGRAVING_FIXTURES_DIR,
	MARKS_DIR,
	RuleVerdicts,
	SCREENSHOTS_DIR,
} from './rule-verdicts';

export interface RuleStripOptions {
	id: string;
	/** 1-based check to show, or undefined for every check. */
	check?: number;
	/** A ref for the "without the fix" tile (`main` when the flag is bare), or undefined for one vexml tile. */
	since?: string;
	/** Answer groups, as `parseAnswerGroups` reads them; undefined lays tiles out ungrouped. */
	groups?: AnswerGroup[];
	/** Output path, resolved from `cwd`; defaults under the OS temp directory. */
	output?: string;
	cwd: string;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

/** Where a strip goes when `--output` is not given: outside the repository. */
export function defaultStripPath(id: string, check?: number): string {
	return path.join(
		tmpdir(),
		'vex-rule-strip',
		`${id}${check === undefined ? '' : `-check-${check}`}.png`,
	);
}

/** Collects the rule's tiles, renders the strip and writes the PNG; returns its path. */
export async function ruleStrip(opts: RuleStripOptions): Promise<string> {
	const model = await collectStrip(opts);
	const width = stripWidth(model);
	const png = await renderers
		.snapshot({
			html: stripHtml(model),
			selector: '#strip',
			width: width * STRIP_ZOOM,
			height: 600,
		})
		.finally(() => renderers.disposeAsync());
	const output = opts.output
		? path.resolve(opts.cwd, opts.output)
		: defaultStripPath(opts.id, opts.check);
	await opts.fs.mkdir(path.dirname(output), { recursive: true });
	await opts.fs.writeBytes(output, png);
	for (const row of model.rows) {
		for (const tile of row.tiles) {
			if (tile.reason) {
				opts.log.info(
					`missing ${row.n === null ? '' : `check ${row.n} `}${tile.label}: ${tile.reason}`,
				);
			}
		}
	}
	opts.log.info(`wrote ${output}`);
	return output;
}

/** CSS pixels per staff space every tile is drawn at. 12 reads smaller but blurs vexml less. */
export const STRIP_SPACE_PX = 14;
/** The page is drawn at this zoom so text and SVG come out sharp. */
export const STRIP_ZOOM = 2;

/** An image ready to place: a data URL with its size and staff space in its own units. */
export interface StripImage {
	src: string;
	width: number;
	height: number;
	space: number;
}

export type StripGroup = 'book' | 'vexml' | 'reference';

/**
 * What names a tile in an answer group: `book`, `vexml` (as it stands, so with the fix
 * under `--since`), `unfixed` (vexml at the `--since` ref), `musescore`, `verovio`, `osmd`.
 */
export const TILE_KEYS = [
	'book',
	'vexml',
	'unfixed',
	'musescore',
	'verovio',
	'osmd',
] as const;
export type TileKey = (typeof TILE_KEYS)[number];

/** One tile: an image, or the reason it is missing. */
export interface StripTile {
	label: string;
	group: StripGroup;
	/** Which tile this is, for answer groups. */
	key?: TileKey;
	image?: StripImage;
	reason?: string;
}

/** A review question's choice: the tiles that draw one look, under one letter. */
export interface AnswerGroup {
	letter: string;
	/** What the group draws, in plain words; may be empty. */
	description: string;
	keys: TileKey[];
}

/**
 * Reads `--groups`: `;`-separated `<letter>=<tile>,<tile>[: <what they draw>]`, for example
 * `A=book,musescore: each sharp in its own brackets; B=vexml,verovio,osmd: plain sharps`.
 */
export function parseAnswerGroups(spec: string): AnswerGroup[] {
	const groups: AnswerGroup[] = [];
	const seen = new Set<TileKey>();
	for (const part of spec.split(';')) {
		const text = part.trim();
		if (text === '') {
			continue;
		}
		const eq = text.indexOf('=');
		if (eq < 0) {
			throw new Error(
				`answer group ${JSON.stringify(text)} needs <letter>=<tile>,<tile>`,
			);
		}
		const letter = text.slice(0, eq).trim();
		if (!/^[A-Z]$/.test(letter)) {
			throw new Error(
				`answer group letter ${JSON.stringify(letter)} must be one capital letter`,
			);
		}
		if (groups.some((g) => g.letter === letter)) {
			throw new Error(`answer group ${letter} is given twice`);
		}
		const rest = text.slice(eq + 1);
		const colon = rest.indexOf(':');
		const list = colon < 0 ? rest : rest.slice(0, colon);
		const description = colon < 0 ? '' : rest.slice(colon + 1).trim();
		const keys: TileKey[] = [];
		for (const raw of list.split(',')) {
			const key = raw.trim().toLowerCase();
			if (key === '') {
				continue;
			}
			if (!(TILE_KEYS as readonly string[]).includes(key)) {
				throw new Error(
					`unknown tile ${JSON.stringify(key)} in answer group ${letter}; use ${TILE_KEYS.join(', ')}`,
				);
			}
			const tileKey = key as TileKey;
			if (seen.has(tileKey)) {
				throw new Error(`tile ${tileKey} is in two answer groups`);
			}
			seen.add(tileKey);
			keys.push(tileKey);
		}
		if (keys.length === 0) {
			throw new Error(`answer group ${letter} names no tiles`);
		}
		groups.push({ letter, description, keys });
	}
	if (groups.length === 0) {
		throw new Error('--groups names no answer groups');
	}
	return groups;
}

/** One check's row of tiles, under its question. */
export interface StripRow {
	/** The check's question, or null for a rule with no checks (its whole fixture). */
	question: string | null;
	n: number | null;
	tiles: StripTile[];
}

export interface StripModel {
	id: string;
	page: string;
	rule: string;
	/** The ref vexml's "without the fix" tile comes from, when this strip reviews a fix. */
	since?: string;
	groups?: AnswerGroup[];
	rows: StripRow[];
}

/** A tile's drawn size in CSS pixels, scaled so a staff space is `spacePx`. */
export function tileSize(
	image: Pick<StripImage, 'width' | 'height' | 'space'>,
	spacePx = STRIP_SPACE_PX,
): { width: number; height: number } {
	const scale = spacePx / (image.space > 0 ? image.space : 10);
	return {
		width: round1(image.width * scale),
		height: round1(image.height * scale),
	};
}

// Layout constants shared by the HTML and the width estimate.
const PAD = 20;
const GAP = 14;
const TILE_PAD = 6;
const MISSING_WIDTH = 150;
const MIN_WIDTH = 480;

/** The strip's width in CSS pixels before zoom: the widest tile or the minimum column width. */
export function stripWidth(
	model: StripModel,
	spacePx = STRIP_SPACE_PX,
): number {
	let widest = MIN_WIDTH;
	for (const row of model.rows) {
		for (const t of row.tiles) {
			const w = t.image ? tileSize(t.image, spacePx).width : MISSING_WIDTH;
			widest = Math.max(widest, w + 2 * TILE_PAD + 2);
		}
	}
	return Math.ceil(2 * PAD + widest);
}

/** The strip as one self-contained HTML document; `#strip` is what gets captured. */
export function stripHtml(model: StripModel, spacePx = STRIP_SPACE_PX): string {
	const totalWidth = stripWidth(model, spacePx);
	const stack = (tiles: StripTile[]) =>
		`<div class="stack">${tiles.map((t) => tileHtml(t, spacePx)).join('')}</div>`;
	const checks = model.rows
		.map((row) => {
			const q =
				row.question === null
					? ''
					: `<p class="q">Check ${row.n}: ${escapeHtml(row.question)}</p>`;
			return `<section class="check">${q}${model.groups ? groupedTiles(row.tiles, model.groups, stack) : plainTiles(row.tiles, stack)}</section>`;
		})
		.join('');
	const fix =
		model.since === undefined
			? ''
			: `<p class="fix">Fix review: vexml without the fix (${escapeHtml(model.since)}) and with it</p>`;
	return `<!doctype html><html><head><meta charset="utf-8"><style>${stripCss(totalWidth)}</style></head><body><div id="strip">${fix}<h1>${escapeHtml(model.rule)}</h1><p class="src">Behind Bars p. ${escapeHtml(model.page)} · ${escapeHtml(model.id)}</p>${checks}</div></body></html>`;
}

type Stack = (tiles: StripTile[]) => string;

/** The book and vexml, then the reference renderers under a divider. */
function plainTiles(tiles: StripTile[], stack: Stack): string {
	const primary = tiles.filter((t) => t.group !== 'reference');
	const refs = tiles.filter((t) => t.group === 'reference');
	const sep =
		primary.length > 0 && refs.length > 0
			? '<div class="sep"><span>References</span></div>'
			: '';
	return `${primary.length > 0 ? stack(primary) : ''}${sep}${refs.length > 0 ? stack(refs) : ''}`;
}

/** One lettered heading per answer group (its letter shown only there), then any tile no group names. */
function groupedTiles(
	tiles: StripTile[],
	groups: AnswerGroup[],
	stack: Stack,
): string {
	const placed = new Set<StripTile>();
	const sections = groups.map((g) => {
		const members = g.keys.flatMap((key) => tiles.filter((t) => t.key === key));
		for (const t of members) {
			placed.add(t);
		}
		const what = g.description === '' ? '' : ` ${escapeHtml(g.description)}`;
		const body =
			members.length > 0
				? stack(members)
				: '<p class="none">No tile here for this check</p>';
		return `<div class="grp"><span class="badge">${escapeHtml(g.letter)}</span>${what}</div>${body}`;
	});
	const rest = tiles.filter((t) => !placed.has(t));
	if (rest.length > 0) {
		sections.push(
			`<div class="sep"><span>Not grouped</span></div>${stack(rest)}`,
		);
	}
	return sections.join('');
}

function tileHtml(tile: StripTile, spacePx: number): string {
	const label = `<figcaption>${escapeHtml(tile.label)}</figcaption>`;
	if (!tile.image) {
		return `<figure><div class="img missing">${escapeHtml(tile.reason ?? 'Unavailable')}</div>${label}</figure>`;
	}
	const { width, height } = tileSize(tile.image, spacePx);
	return `<figure><div class="img"><img src="${tile.image.src}" style="width:${width}px;height:${height}px"></div>${label}</figure>`;
}

function stripCss(totalWidth: number): string {
	return `body{margin:0;background:#fff;zoom:${STRIP_ZOOM}}
#strip{display:inline-block;width:${totalWidth}px;box-sizing:border-box;padding:18px ${PAD}px 20px;font:14px/1.35 -apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1b1b1b;background:#fff}
h1{font-size:15px;margin:0 0 4px;font-weight:600}
.src{margin:0 0 6px;color:#666;font-size:12px}
.fix{display:inline-block;margin:0 0 10px;padding:3px 8px;border-radius:4px;background:#fff4d6;color:#6b4a00;font-size:12px;font-weight:600}
.grp{display:flex;align-items:center;gap:8px;margin:16px 0 10px;font-weight:600;color:#1b1b1b}
.badge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:11px;background:#1b1b1b;color:#fff;font-size:12px;font-weight:700}
.none{color:#888;font-size:12px;margin:0}

.check+.check{margin-top:22px;padding-top:18px;border-top:1px solid #e2e2e2}
.q{color:#555;margin:10px 0 12px}
.stack{display:flex;flex-direction:column;gap:${GAP}px}
figure{margin:0;width:100%;display:flex;flex-direction:column;align-items:stretch}
.img{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:4px;padding:${TILE_PAD}px;background:#fff;display:flex;align-items:center;justify-content:flex-start}
.img img{display:block}
.missing{min-height:80px;justify-content:center;color:#888;font-size:12px;text-align:center;background:#f6f6f6}
figcaption{font-size:12px;color:#555;margin-top:5px;text-align:left;padding-left:2px}
.sep{display:flex;align-items:center;gap:10px;margin:14px 0 10px;color:#777;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase}
.sep::before,.sep::after{content:'';height:1px;background:#e2e2e2;flex:1}
.sep::before{flex:0 0 14px}`;
}

/** Reads the rule, its checks and every tile's crop. */
export async function collectStrip(
	opts: Pick<
		RuleStripOptions,
		'id' | 'check' | 'since' | 'groups' | 'fs' | 'ps'
	> & {
		/** Swappable for tests; defaults to the cached MuseScore, Verovio and OSMD renders. */
		references?: ReferenceSource | null;
		/** Swappable for tests; defaults to `git show <ref>:<path>`. */
		readAt?: (ref: string, repoPath: string) => Promise<Uint8Array | null>;
	},
): Promise<StripModel> {
	const { fs, ps } = opts;
	if (
		opts.since === undefined &&
		opts.groups?.some((g) => g.keys.includes('unfixed'))
	) {
		throw new Error(
			'the unfixed tile needs --since: it is vexml at that ref, without the fix',
		);
	}
	const verdicts = new RuleVerdicts(fs);
	const row = (await verdicts.readRules()).find((r) => r.id === opts.id);
	if (!row) {
		throw new Error(`no Behind Bars rule ${JSON.stringify(opts.id)}`);
	}
	const { fixtureName } = await verdicts.fingerprint(row);
	const notePath = path.join('packages/integration/rules', `${row.id}.md`);
	const note = (await fs.exists(notePath)) ? await fs.read(notePath) : '';
	let checks = parseRuleChecks(note);
	if (opts.check !== undefined) {
		const picked = checks.find((c) => c.n === opts.check);
		if (!picked) {
			throw new Error(
				`${row.id} has ${checks.length} check${checks.length === 1 ? '' : 's'}, no check ${opts.check}`,
			);
		}
		checks = [picked];
	}

	const { before, after } = await loadRuleRenderPair({
		fixtureName,
		since: opts.since,
		fs,
		readAt: opts.readAt,
	});
	const vexmlTiles = (crop: (render: LoadedRender) => StripImage | null) => {
		const tiles: StripTile[] = [];
		if (opts.since !== undefined) {
			tiles.push(
				renderTile(
					'unfixed',
					`vexml: without the fix (${opts.since})`,
					before,
					crop,
					'not at that ref',
				),
			);
		}
		tiles.push(
			renderTile(
				'vexml',
				opts.since === undefined ? 'vexml' : 'vexml: with the fix',
				after,
				crop,
				`no screenshot; run vex test ${fixtureName} --update`,
			),
		);
		return tiles;
	};
	const header = {
		id: row.id,
		page: row.page,
		rule: row.rule,
		...(opts.since === undefined ? {} : { since: opts.since }),
		...(opts.groups === undefined ? {} : { groups: opts.groups }),
	};

	if (checks.length === 0) {
		return {
			...header,
			rows: [{ question: null, n: null, tiles: vexmlTiles(wholeRender) }],
		};
	}

	const bookCropper = new BookCropper(fs, resolveBookDir(ps));
	const references =
		opts.references === undefined
			? new RuleReferenceCache({
					fs,
					ps,
					cacheDir: await resolveRuleReferenceCacheDir(ps),
				})
			: opts.references;
	const fixturePath = path.join(
		ENGRAVING_FIXTURES_DIR,
		`${fixtureName}.musicxml`,
	);
	const musicXML = (await fs.exists(fixturePath))
		? await fs.read(fixturePath)
		: null;

	const rows: StripRow[] = [];
	for (const check of checks) {
		const tiles: StripTile[] = [];
		if (check.book) {
			tiles.push(await bookTile(bookCropper, check));
		}
		tiles.push(...vexmlTiles((render) => cropImage(render, check)));
		tiles.push(...(await referenceTiles(references, musicXML, check)));
		rows.push({ question: check.question, n: check.n, tiles });
	}
	return { ...header, rows };
}

/** The reference renderers' crops, as `RuleReferenceCache` gives them. */
export type ReferenceSource = Pick<RuleReferenceCache, 'cropAll'>;

/** A loaded engraving screenshot alongside its parsed layout geometry. */
export interface LoadedRender {
	png: PNG;
	bytes: Buffer;
	geometry: RenderGeometry | null;
}

/** Options for loading a rule fixture's current render and optional base-ref render. */
export interface LoadRuleRenderPairOptions {
	fixtureName: string;
	/** Base git ref to load the "before" render from; omit to skip loading `before`. */
	since?: string;
	/** Swappable for tests; defaults to `git show <ref>:<path>`. */
	readAt?: (ref: string, repoPath: string) => Promise<Uint8Array | null>;
	fs: Fs;
}

/** Loads a fixture's current render and, when `since` is set, its render at that git ref. */
export async function loadRuleRenderPair(
	opts: LoadRuleRenderPairOptions,
): Promise<{ before: LoadedRender | null; after: LoadedRender | null }> {
	const { fs, fixtureName } = opts;
	const screenshotPath = path.join(SCREENSHOTS_DIR, ruleSnapshot(fixtureName));
	const after = await loadRender(
		fs
			.exists(screenshotPath)
			.then(async (found) => (found ? fs.readBytes(screenshotPath) : null)),
		readGeometry(fs, fixtureName),
	);
	let before: LoadedRender | null = null;
	if (opts.since !== undefined) {
		const readAt = opts.readAt ?? gitShowBytes;
		const since = opts.since;
		before = await loadRender(
			readAt(since, `vexml/${screenshotPath}`),
			readAt(
				since,
				`vexml/${path.join(MARKS_DIR, `engraving_${fixtureName}.geometry.json`)}`,
			).then((bytes) =>
				bytes
					? parseRenderGeometry(JSON.parse(Buffer.from(bytes).toString('utf8')))
					: null,
			),
		);
	}
	return { before, after };
}

/** Crops one check's rectangle from a loaded render, or returns null when missing from layout. */
export function cropCheckPng(
	render: LoadedRender,
	check: RuleCheck,
): { png: PNG; space: number } | null {
	if (!render.geometry) {
		return null;
	}
	const rect = cropRect(check.crop, render.geometry, render.png);
	if (!rect) {
		return null;
	}
	const out = new PNG({ width: rect.w, height: rect.h });
	PNG.bitblt(render.png, out, rect.x, rect.y, rect.w, rect.h, 0, 0);
	return { png: out, space: rect.space };
}

async function loadRender(
	bytes: Promise<Uint8Array | null>,
	geometry: Promise<RenderGeometry | null>,
): Promise<LoadedRender | null> {
	const [raw, layout] = await Promise.all([bytes, geometry]);
	if (!raw) {
		return null;
	}
	try {
		const buffer = Buffer.from(raw);
		return { png: PNG.sync.read(buffer), bytes: buffer, geometry: layout };
	} catch {
		return null;
	}
}

function renderTile(
	key: TileKey,
	label: string,
	render: LoadedRender | null,
	crop: (render: LoadedRender) => StripImage | null,
	missing: string,
): StripTile {
	if (!render) {
		return { label, group: 'vexml', key, reason: missing };
	}
	const image = crop(render);
	return image
		? { label, group: 'vexml', key, image }
		: {
				label,
				group: 'vexml',
				key,
				reason: 'measure not found in its layout',
			};
}

function wholeRender(render: LoadedRender): StripImage {
	return {
		src: pngDataUrl(render.bytes),
		width: render.png.width,
		height: render.png.height,
		// The engraving tests draw at 10 pixels a space.
		space: 10,
	};
}

function cropImage(render: LoadedRender, check: RuleCheck): StripImage | null {
	const cropped = cropCheckPng(render, check);
	if (!cropped) {
		return null;
	}
	return {
		src: pngDataUrl(PNG.sync.write(cropped.png)),
		width: cropped.png.width,
		height: cropped.png.height,
		space: cropped.space,
	};
}

async function bookTile(
	cropper: BookCropper,
	check: RuleCheck,
): Promise<StripTile> {
	const label = `Behind Bars p. ${check.book?.page}`;
	const crop = check.book ? await cropper.crop(check.book) : null;
	if (!crop) {
		return {
			label,
			group: 'book',
			key: 'book',
			reason: 'book not found; set VEXML_BOOK_DIR',
		};
	}
	return {
		label,
		group: 'book',
		key: 'book',
		image: {
			src: pngDataUrl(crop.png),
			width: crop.width,
			height: crop.height,
			space: crop.space,
		},
	};
}

async function referenceTiles(
	references: ReferenceSource | null,
	musicXML: string | null,
	check: RuleCheck,
): Promise<StripTile[]> {
	if (!references || musicXML === null) {
		return [];
	}
	const results = await references.cropAll({
		musicXML,
		crop: check.crop,
		imageUrl: () => '',
	});
	return results.map(({ tile, bytes, contentType }): StripTile => {
		const { width, height, space } = tile;
		const key = referenceKey(tile.id);
		if (tile.status !== 'ready' || !bytes || !width || !height || !space) {
			return {
				label: tile.label,
				group: 'reference',
				...(key ? { key } : {}),
				reason: tile.reason ?? 'unavailable',
			};
		}
		return {
			label: tile.label,
			group: 'reference',
			...(key ? { key } : {}),
			image: {
				src: `data:${contentType ?? 'image/png'};base64,${bytes.toString('base64')}`,
				width,
				height,
				space,
			},
		};
	});
}

function referenceKey(id: string): TileKey | undefined {
	return (TILE_KEYS as readonly string[]).includes(id)
		? (id as TileKey)
		: undefined;
}

function pngDataUrl(bytes: Buffer): string {
	return `data:image/png;base64,${bytes.toString('base64')}`;
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

const execFileAsync = promisify(execFile);

/** `git show <ref>:<repoPath>` from the repository root, or null when it is not there. */
async function gitShowBytes(
	ref: string,
	repoPath: string,
): Promise<Uint8Array | null> {
	try {
		const { stdout: root } = await execFileAsync(
			'git',
			['rev-parse', '--show-toplevel'],
			{ encoding: 'utf8' },
		);
		const { stdout } = await execFileAsync(
			'git',
			['show', `${ref}:${repoPath}`],
			{
				cwd: root.trim(),
				encoding: 'buffer',
				maxBuffer: 20 * 1024 * 1024,
			},
		);
		return new Uint8Array(stdout);
	} catch {
		return null;
	}
}
