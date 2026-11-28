// The checks a rule note declares under `### Checks`: one plain question per check, each with
// the spot of the score it asks about, in score terms (measure, staff, staff spaces) so any
// renderer can crop the same region.
//
//   ### Checks
//
//   1. Does the treble clef curl around the G line?
//      Crop: measure 1, 5 spaces
//      Book: p. 5, 0.318 0.865 0.068 0.052
//   2. Do the bass clef's dots sit either side of the F line?
//      Crop: measure 5, 5 spaces
//      Marks: shown

/** The heading a rule note declares its checks under. */
export const CHECKS_HEADING = '### Checks';

/** One check of a rule: a question the reviewer answers by eye on a crop of the render. */
export interface RuleCheck {
	/** 1-based position under `### Checks`. */
	n: number;
	question: string;
	crop: RuleCrop;
	/** Optional Behind Bars example on a print page, as fractions of the page image. */
	book: RuleBookBox | null;
	/** Whether the crop holds enough that the agent's marks help; drawn only then. */
	marks: boolean;
	/** The check's lines as written, which its fingerprint hashes. */
	source: string;
}

/** A region of the score in score terms. */
export interface RuleCrop {
	/** 1-based measure number. */
	measure: number;
	/** 1-based part. */
	part: number;
	/** 1-based staff within the part. */
	staff: number;
	/** Staff spaces from the measure's start where the crop begins. */
	from: number;
	/** Width in staff spaces, or null for the rest of the measure. */
	width: number | null;
	/** Staff spaces above the top line and below the bottom line. */
	above: number;
	below: number;
}

export const DEFAULT_CROP_PAD = 4;

/**
 * Parses a note's `### Checks` section. Returns [] when the note declares none; throws on a
 * check it cannot read, so a typo fails loudly rather than dropping a check.
 */
export function parseRuleChecks(note: string): RuleCheck[] {
	const lines = note.split('\n');
	const start = lines.findIndex((line) => line.trim() === CHECKS_HEADING);
	if (start === -1) {
		return [];
	}
	const items: string[][] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^#{1,3} /.test(line)) {
			break;
		}
		if (/^\d+\.\s/.test(line)) {
			items.push([line]);
		} else if (line.trim() && items.length > 0) {
			items.at(-1)?.push(line);
		}
	}
	return items.map((item, i) => parseCheck(item, i + 1));
}

function parseCheck(item: string[], n: number): RuleCheck {
	const question = (item[0] ?? '').replace(/^\d+\.\s+/, '').trim();
	let crop: RuleCrop | null = null;
	let book: RuleBookBox | null = null;
	let marks = false;
	for (const raw of item.slice(1)) {
		const line = raw.trim();
		const field = /^(Crop|Book|Marks):\s*(.+)$/i.exec(line);
		if (!field?.[1] || !field[2]) {
			throw new Error(`check ${n}: cannot read ${JSON.stringify(line)}`);
		}
		const key = field[1].toLowerCase();
		if (key === 'crop') {
			crop = parseCrop(field[2], n);
		} else if (key === 'book') {
			book = parseBookBox(field[2], n);
		} else {
			marks = /^(shown|yes)$/i.test(field[2].trim());
		}
	}
	if (!question.endsWith('?')) {
		throw new Error(
			`check ${n}: ${JSON.stringify(question)} is not a question`,
		);
	}
	if (!crop) {
		throw new Error(`check ${n}: no Crop line`);
	}
	return {
		n,
		question,
		crop,
		book,
		marks,
		source: item.map((line) => line.trim()).join('\n'),
	};
}

/** A region of a Behind Bars print page, in page fractions (0..1) from the top-left. */
export interface RuleBookBox {
	/** Print page label as the book writes it, e.g. `5` or `xi`. */
	page: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Parses `p. 5, 0.318 0.865 0.068 0.052` (print page plus x y w h page fractions). */
export function parseBookBox(text: string, n = 1): RuleBookBox {
	const match =
		/^(?:p\.\s*)?([a-z0-9]+)\s*,\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/i.exec(
			text.trim(),
		);
	if (!match) {
		throw new Error(`check ${n}: cannot read book ${JSON.stringify(text)}`);
	}
	const page = (match[1] ?? '').toLowerCase();
	const x = Number(match[2]);
	const y = Number(match[3]);
	const w = Number(match[4]);
	const h = Number(match[5]);
	if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) {
		throw new Error(
			`check ${n}: book box out of page bounds ${JSON.stringify(text)}`,
		);
	}
	return { page, x, y, w, h };
}

/** Parses `measure 5, staff 2, from 3 spaces, 6 spaces, 6 above, 2 below`. */
export function parseCrop(text: string, n = 1): RuleCrop {
	const crop: RuleCrop = {
		measure: 0,
		part: 1,
		staff: 1,
		from: 0,
		width: null,
		above: DEFAULT_CROP_PAD,
		below: DEFAULT_CROP_PAD,
	};
	for (const piece of text.split(',')) {
		const part = piece.trim();
		const m =
			/^(measure|part|staff)\s+(\d+)$/.exec(part) ??
			/^(from)\s+(\d+(?:\.\d+)?)\s+spaces?$/.exec(part) ??
			/^()(\d+(?:\.\d+)?)\s+spaces?$/.exec(part) ??
			/^(\d+(?:\.\d+)?)\s+(above|below)$/.exec(part);
		if (!m) {
			throw new Error(`check ${n}: cannot read crop ${JSON.stringify(part)}`);
		}
		const [, a = '', b = ''] = m;
		if (b === 'above' || b === 'below') {
			crop[b] = Number(a);
		} else if (a === '') {
			crop.width = Number(b);
		} else {
			crop[a as 'measure' | 'part' | 'staff' | 'from'] = Number(b);
		}
	}
	if (crop.measure < 1) {
		throw new Error(`check ${n}: crop names no measure`);
	}
	return crop;
}

/** Where the test harness records the render's layout, in screenshot pixels. */
export interface RenderGeometry {
	screenshot: string;
	measures: { index: number; system: number; x: number; w: number }[];
	staves: {
		part: number;
		measure: number;
		staff: number;
		lines: number[];
		x: number;
		w: number;
	}[];
}

export interface PixelRect {
	x: number;
	y: number;
	w: number;
	h: number;
	/** A staff space in pixels, so tiles can show crops at one size. */
	space: number;
}

/** The crop's pixel rectangle on the screenshot, or null when the geometry lacks its staff. */
export function cropRect(
	crop: RuleCrop,
	geometry: RenderGeometry,
	image: { width: number; height: number },
): PixelRect | null {
	const index = crop.measure - 1;
	const stave = geometry.staves.find(
		(s) =>
			s.measure === index && s.part === crop.part - 1 && s.staff === crop.staff,
	);
	const top = stave?.lines[0];
	const bottom = stave?.lines.at(-1);
	if (!stave || top === undefined || bottom === undefined) {
		return null;
	}
	const space =
		stave.lines.length > 1 ? (bottom - top) / (stave.lines.length - 1) : 10;
	const measure = geometry.measures.find((m) => m.index === index);
	const left = Math.min(stave.x, measure?.x ?? stave.x);
	const right = Math.max(
		stave.x + stave.w,
		measure ? measure.x + measure.w : 0,
	);
	const x0 = left + crop.from * space - (crop.from === 0 ? space / 2 : 0);
	const x1 = crop.width === null ? right + space / 2 : x0 + crop.width * space;
	const y0 = top - crop.above * space;
	const y1 = bottom + crop.below * space;
	const x = clamp(Math.floor(x0), 0, image.width);
	const y = clamp(Math.floor(y0), 0, image.height);
	const w = clamp(Math.ceil(x1), 0, image.width) - x;
	const h = clamp(Math.ceil(y1), 0, image.height) - y;
	return w > 0 && h > 0 ? { x, y, w, h, space } : null;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}
