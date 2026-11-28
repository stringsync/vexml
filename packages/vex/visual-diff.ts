import { PNG } from 'pngjs';

/** Thresholds for the agreed vexml visual-change significance bar. */
export const SIGNIFICANCE_THRESHOLDS = {
	minBroadImageCount: 5,
	minHeightDeltaPx: 15,
	minMovedInkPercent: 2,
	minNonEngravingMovedInkPx: 100,
} as const;

/**
 * Classifies a repo-relative path into its watched image category, or null when
 * the file is outside the watched vexml image sets (e.g. lint defect corpus).
 */
export function classifyImage(repoPath: string): ImageKind | null {
	if (repoPath.startsWith(README_PREFIX)) {
		return /\.(png|gif|webp|jpe?g)$/i.test(repoPath) ? 'readme' : null;
	}
	if (!repoPath.startsWith(SCREENSHOTS_PREFIX) || !repoPath.endsWith('.png')) {
		return null;
	}
	const name = repoPath.slice(SCREENSHOTS_PREFIX.length);
	if (name.includes('/')) {
		return null;
	}
	if (name.startsWith('engraving_')) {
		return 'engraving';
	}
	if (
		name.startsWith('score_') ||
		name.startsWith('headless_') ||
		name.startsWith('pages_')
	) {
		return 'score';
	}
	return 'feature';
}

/** Category of a committed vexml image watched for visual regressions. */
export type ImageKind = 'readme' | 'score' | 'feature' | 'engraving';

/** Shift-safe visual difference metrics between two versions of a PNG. */
export interface VisualDiffMetrics {
	beforeWidth: number;
	beforeHeight: number;
	afterWidth: number;
	afterHeight: number;
	widthDelta: number;
	heightDelta: number;
	inkPixels: number;
	movedInkPixels: number;
	movedInkPercent: number;
}

/** A modified committed image with its measured visual delta. */
export interface ImageChange {
	path: string;
	name: string;
	kind: ImageKind;
	metrics: VisualDiffMetrics | null;
}

/** Outcome of evaluating a landing's modified images against the significance bar. */
export interface SignificanceResult {
	significant: boolean;
	reasons: string[];
	ranked: ImageChange[];
}

const SCREENSHOTS_PREFIX = 'vexml/packages/integration/__screenshots__/';
const README_PREFIX = 'vexml/.github/readme/';
const JITTER_RADIUS = 2;
const INK_ALPHA_MIN = 20;
const INK_CHANNEL_MAX = 220;
const DIFF_CHANNEL_THRESHOLD = 30;
const MAX_CROP_HEIGHT = 260;
const CROP_PAD_X = 44;
const CROP_PAD_Y = 48;
const UPSCALE_MAX_WIDTH = 420;

/**
 * Measures visual differences between two PNG buffers while ignoring 1-2px
 * anti-aliasing and subpixel jitter via a Chebyshev-2 ink neighborhood check.
 */
export function measurePngDiff(
	beforePng: Buffer,
	afterPng: Buffer,
): VisualDiffMetrics {
	const before = PNG.sync.read(beforePng);
	const after = PNG.sync.read(afterPng);
	const width = Math.max(before.width, after.width);
	const height = Math.max(before.height, after.height);
	const paddedBefore = padWhite(before, width, height);
	const paddedAfter = padWhite(after, width, height);

	const inkBefore = extractInkMask(paddedBefore);
	const inkAfter = extractInkMask(paddedAfter);

	let inkPixels = 0;
	for (let i = 0; i < width * height; i++) {
		if (inkBefore[i] === 1 || inkAfter[i] === 1) {
			inkPixels++;
		}
	}

	const movedInkPixels = countDisplacedInk(inkBefore, inkAfter, width, height);
	const movedInkPercent =
		inkPixels > 0 ? round2((100 * movedInkPixels) / inkPixels) : 0;

	return {
		beforeWidth: before.width,
		beforeHeight: before.height,
		afterWidth: after.width,
		afterHeight: after.height,
		widthDelta: Math.abs(after.width - before.width),
		heightDelta: Math.abs(after.height - before.height),
		inkPixels,
		movedInkPixels,
		movedInkPercent,
	};
}

/**
 * Evaluates a set of modified watched images against the significance bar and
 * returns them ranked most-impactful first.
 */
export function evaluateSignificance(
	images: readonly ImageChange[],
): SignificanceResult {
	const ranked = [...images].sort((a, b) => scoreChange(b) - scoreChange(a));
	const reasons: string[] = [];

	if (ranked.length >= SIGNIFICANCE_THRESHOLDS.minBroadImageCount) {
		reasons.push(`${ranked.length} existing images changed`);
	}

	const readmeImages = ranked.filter((img) => img.kind === 'readme');
	if (readmeImages.length > 0) {
		reasons.push(
			`README image changed (${readmeImages.map((img) => img.name).join(', ')})`,
		);
	}

	let maxHeightDelta = 0;
	let maxHeightImage = '';
	let maxMovedInkPercent = 0;
	let maxMovedInkImage = '';
	let notableNonEngraving: ImageChange | null = null;

	for (const img of ranked) {
		const m = img.metrics;
		if (m === null) {
			continue;
		}
		if (m.heightDelta > maxHeightDelta) {
			maxHeightDelta = m.heightDelta;
			maxHeightImage = img.name;
		}
		if (m.movedInkPercent > maxMovedInkPercent) {
			maxMovedInkPercent = m.movedInkPercent;
			maxMovedInkImage = img.name;
		}
		if (
			notableNonEngraving === null &&
			(img.kind === 'score' || img.kind === 'feature') &&
			m.movedInkPixels >= SIGNIFICANCE_THRESHOLDS.minNonEngravingMovedInkPx
		) {
			notableNonEngraving = img;
		}
	}

	if (maxHeightDelta >= SIGNIFICANCE_THRESHOLDS.minHeightDeltaPx) {
		reasons.push(
			`layout height shifted by ${maxHeightDelta}px (${maxHeightImage})`,
		);
	}
	if (maxMovedInkPercent >= SIGNIFICANCE_THRESHOLDS.minMovedInkPercent) {
		reasons.push(`${maxMovedInkPercent}% of ink moved (${maxMovedInkImage})`);
	}
	if (notableNonEngraving !== null && notableNonEngraving.metrics !== null) {
		reasons.push(
			`${notableNonEngraving.kind} baseline changed (${notableNonEngraving.name}, ${notableNonEngraving.metrics.movedInkPixels} moved ink px)`,
		);
	}

	return {
		significant: reasons.length > 0,
		reasons,
		ranked,
	};
}

/**
 * Renders a vertically stacked Before / Diff (red = removed, blue = added) /
 * After PNG cropped tightly around the densest changed region, upscaled 2x when
 * narrow so notation details remain sharp on phone screens.
 */
export function renderDiffPanel(
	beforePng: Buffer,
	afterPng: Buffer,
	title: string,
): Buffer {
	const before = PNG.sync.read(beforePng);
	const after = PNG.sync.read(afterPng);
	const width = Math.max(before.width, after.width);
	const height = Math.max(before.height, after.height);
	const pb = padWhite(before, width, height);
	const pa = padWhite(after, width, height);

	const crop = selectCropBox(pb, pa);
	const cw = crop.x1 - crop.x0;
	const ch = crop.y1 - crop.y0;
	const scale = cw < UPSCALE_MAX_WIDTH ? 2 : 1;
	const pw = cw * scale;
	const ph = ch * scale;

	const margin = 12;
	const titleScale =
		title.length * 12 + margin * 2 <= Math.max(pw + margin * 2, 460) ? 2 : 1;
	const titleHeight = titleScale === 2 ? 28 : 20;
	const labelHeight = 18;
	const gap = 10;
	const titleWidth = title.length * 6 * titleScale + margin * 2;
	const totalWidth = Math.max(pw + margin * 2, titleWidth, 460);
	const totalHeight = titleHeight + 3 * (labelHeight + ph + gap) + margin;

	const out = new PNG({ width: totalWidth, height: totalHeight });
	fillRect(out, 0, 0, totalWidth, totalHeight, 248, 250, 252);
	drawText(out, title, margin, 7, titleScale, 15, 23, 42);

	const sections: Array<{ label: string; mode: 'before' | 'diff' | 'after' }> =
		[
			{ label: 'BEFORE', mode: 'before' },
			{ label: 'DIFF (RED=OLD, BLUE=NEW)', mode: 'diff' },
			{ label: 'AFTER', mode: 'after' },
		];

	let yCursor = titleHeight;
	for (const section of sections) {
		drawText(out, section.label, margin, yCursor + 3, 1, 71, 85, 105);
		yCursor += labelHeight;
		drawBorder(out, margin - 1, yCursor - 1, pw + 2, ph + 2, 203, 213, 225);
		blitPanel(out, pb, pa, crop, margin, yCursor, scale, section.mode);
		yCursor += ph + gap;
	}

	return PNG.sync.write(out);
}

interface CropBox {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

function selectCropBox(pb: PNG, pa: PNG): CropBox {
	const { width, height } = pb;
	const rowCounts = new Int32Array(height);
	let totalChanged = 0;

	for (let y = 0; y < height; y++) {
		let count = 0;
		for (let x = 0; x < width; x++) {
			if (pixelDiffers(pb.data, pa.data, (y * width + x) * 4)) {
				count++;
			}
		}
		rowCounts[y] = count;
		totalChanged += count;
	}

	if (totalChanged === 0) {
		return {
			x0: 0,
			y0: 0,
			x1: Math.min(width, 600),
			y1: Math.min(height, MAX_CROP_HEIGHT),
		};
	}

	// Pick the vertical window of at most MAX_CROP_HEIGHT rows with the most changed pixels.
	const windowHeight = Math.min(height, MAX_CROP_HEIGHT - CROP_PAD_Y * 2);
	let bestTop = 0;
	let bestSum = -1;
	let running = 0;
	for (let y = 0; y < height; y++) {
		running += rowCounts[y] ?? 0;
		if (y >= windowHeight) {
			running -= rowCounts[y - windowHeight] ?? 0;
		}
		if (running > bestSum) {
			bestSum = running;
			bestTop = Math.max(0, y - windowHeight + 1);
		}
	}

	const scanBottom = Math.min(height, bestTop + windowHeight);
	let minX = width;
	let maxX = -1;
	let minY = scanBottom;
	let maxY = -1;
	for (let y = bestTop; y < scanBottom; y++) {
		if ((rowCounts[y] ?? 0) === 0) {
			continue;
		}
		for (let x = 0; x < width; x++) {
			if (pixelDiffers(pb.data, pa.data, (y * width + x) * 4)) {
				if (x < minX) {
					minX = x;
				}
				if (x > maxX) {
					maxX = x;
				}
				if (y < minY) {
					minY = y;
				}
				if (y > maxY) {
					maxY = y;
				}
			}
		}
	}

	if (maxX < minX || maxY < minY) {
		return {
			x0: 0,
			y0: 0,
			x1: Math.min(width, 600),
			y1: Math.min(height, MAX_CROP_HEIGHT),
		};
	}

	return {
		x0: Math.max(0, minX - CROP_PAD_X),
		y0: Math.max(0, minY - CROP_PAD_Y),
		x1: Math.min(width, maxX + CROP_PAD_X + 1),
		y1: Math.min(height, maxY + CROP_PAD_Y + 1),
	};
}

const KIND_PRIORITY: Record<ImageKind, number> = {
	readme: 100_000,
	score: 2_000,
	feature: 1_500,
	engraving: 0,
};

function scoreChange(change: ImageChange): number {
	const kindBonus = KIND_PRIORITY[change.kind];
	const m = change.metrics;
	if (m === null) {
		return kindBonus;
	}
	return (
		kindBonus +
		m.heightDelta * 40 +
		m.movedInkPercent * 120 +
		Math.min(m.movedInkPixels, 10_000) * 0.25
	);
}

function padWhite(src: PNG, width: number, height: number): PNG {
	if (src.width === width && src.height === height) {
		return src;
	}
	const out = new PNG({ width, height });
	out.data.fill(255);
	PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
	return out;
}

function extractInkMask(png: PNG): Uint8Array {
	const { width, height, data } = png;
	const mask = new Uint8Array(width * height);
	for (let i = 0; i < width * height; i++) {
		const o = i * 4;
		mask[i] = isInkPixel(data, o) ? 1 : 0;
	}
	return mask;
}

function isInkPixel(data: Buffer, offset: number): boolean {
	const alpha = data[offset + 3] ?? 0;
	if (alpha <= INK_ALPHA_MIN) {
		return false;
	}
	const r = data[offset] ?? 255;
	const g = data[offset + 1] ?? 255;
	const b = data[offset + 2] ?? 255;
	return Math.min(r, g, b) < INK_CHANNEL_MAX;
}

function pixelDiffers(a: Buffer, b: Buffer, offset: number): boolean {
	const dr = Math.abs((a[offset] ?? 0) - (b[offset] ?? 0));
	const dg = Math.abs((a[offset + 1] ?? 0) - (b[offset + 1] ?? 0));
	const db = Math.abs((a[offset + 2] ?? 0) - (b[offset + 2] ?? 0));
	const da = Math.abs((a[offset + 3] ?? 0) - (b[offset + 3] ?? 0));
	return Math.max(dr, dg, db, da) > DIFF_CHANNEL_THRESHOLD;
}

function countDisplacedInk(
	inkBefore: Uint8Array,
	inkAfter: Uint8Array,
	width: number,
	height: number,
): number {
	let displaced = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			if (inkBefore[i] === inkAfter[i]) {
				continue;
			}
			const other = inkAfter[i] === 1 ? inkBefore : inkAfter;
			if (!hasNeighbor(other, width, height, x, y, JITTER_RADIUS)) {
				displaced++;
			}
		}
	}
	return displaced;
}

function hasNeighbor(
	mask: Uint8Array,
	width: number,
	height: number,
	cx: number,
	cy: number,
	radius: number,
): boolean {
	const y0 = Math.max(0, cy - radius);
	const y1 = Math.min(height - 1, cy + radius);
	const x0 = Math.max(0, cx - radius);
	const x1 = Math.min(width - 1, cx + radius);
	for (let y = y0; y <= y1; y++) {
		const row = y * width;
		for (let x = x0; x <= x1; x++) {
			if (mask[row + x] === 1) {
				return true;
			}
		}
	}
	return false;
}

function blitPanel(
	out: PNG,
	pb: PNG,
	pa: PNG,
	crop: CropBox,
	destX: number,
	destY: number,
	scale: number,
	mode: 'before' | 'diff' | 'after',
): void {
	const cw = crop.x1 - crop.x0;
	const ch = crop.y1 - crop.y0;
	for (let y = 0; y < ch; y++) {
		for (let x = 0; x < cw; x++) {
			const srcOff = ((crop.y0 + y) * pb.width + (crop.x0 + x)) * 4;
			let r: number;
			let g: number;
			let b: number;
			if (mode === 'before') {
				r = pb.data[srcOff] ?? 255;
				g = pb.data[srcOff + 1] ?? 255;
				b = pb.data[srcOff + 2] ?? 255;
			} else if (mode === 'after') {
				r = pa.data[srcOff] ?? 255;
				g = pa.data[srcOff + 1] ?? 255;
				b = pa.data[srcOff + 2] ?? 255;
			} else {
				const ib = isInkPixel(pb.data, srcOff);
				const ia = isInkPixel(pa.data, srcOff);
				if (ib && !ia) {
					r = 220;
					g = 38;
					b = 38;
				} else if (!ib && ia) {
					r = 37;
					g = 99;
					b = 235;
				} else if (ib && ia) {
					r = 175;
					g = 180;
					b = 188;
				} else {
					r = 255;
					g = 255;
					b = 255;
				}
			}
			for (let sy = 0; sy < scale; sy++) {
				for (let sx = 0; sx < scale; sx++) {
					setPixel(
						out,
						destX + x * scale + sx,
						destY + y * scale + sy,
						r,
						g,
						b,
					);
				}
			}
		}
	}
}

function fillRect(
	png: PNG,
	x0: number,
	y0: number,
	w: number,
	h: number,
	r: number,
	g: number,
	b: number,
): void {
	for (let y = y0; y < y0 + h; y++) {
		for (let x = x0; x < x0 + w; x++) {
			setPixel(png, x, y, r, g, b);
		}
	}
}

function drawBorder(
	png: PNG,
	x0: number,
	y0: number,
	w: number,
	h: number,
	r: number,
	g: number,
	b: number,
): void {
	for (let x = x0; x < x0 + w; x++) {
		setPixel(png, x, y0, r, g, b);
		setPixel(png, x, y0 + h - 1, r, g, b);
	}
	for (let y = y0; y < y0 + h; y++) {
		setPixel(png, x0, y, r, g, b);
		setPixel(png, x0 + w - 1, y, r, g, b);
	}
}

function setPixel(
	png: PNG,
	x: number,
	y: number,
	r: number,
	g: number,
	b: number,
): void {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
		return;
	}
	const o = (y * png.width + x) * 4;
	png.data[o] = r;
	png.data[o + 1] = g;
	png.data[o + 2] = b;
	png.data[o + 3] = 255;
}

// Compact 5x7 bitmap font (uppercase + digits + punctuation) so panels need no native canvas.
const FONT_5X7: Record<string, readonly string[]> = {
	A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
	B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
	C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
	D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
	E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
	F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
	G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
	H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
	I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
	J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
	K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
	L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
	M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
	N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
	O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
	P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
	Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
	R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
	S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
	T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
	U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
	V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
	W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
	X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
	Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
	Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
	'0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
	'1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
	'2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
	'3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
	'4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
	'5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
	'6': ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
	'7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
	'8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
	'9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
	'(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
	')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
	'=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
	',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
	'.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
	'-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
	_: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
	':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
	'/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
	'%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
	'+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
};

function drawText(
	png: PNG,
	text: string,
	x0: number,
	y0: number,
	scale: number,
	r: number,
	g: number,
	b: number,
): void {
	let cursor = x0;
	for (const ch of text.toUpperCase()) {
		if (ch === ' ') {
			cursor += 4 * scale;
			continue;
		}
		const glyph = FONT_5X7[ch];
		if (glyph !== undefined) {
			for (let gy = 0; gy < glyph.length; gy++) {
				const row = glyph[gy] ?? '';
				for (let gx = 0; gx < row.length; gx++) {
					if (row[gx] === '1') {
						fillRect(
							png,
							cursor + gx * scale,
							y0 + gy * scale,
							scale,
							scale,
							r,
							g,
							b,
						);
					}
				}
			}
		}
		cursor += 6 * scale;
		if (cursor >= png.width - 12) {
			break;
		}
	}
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}
