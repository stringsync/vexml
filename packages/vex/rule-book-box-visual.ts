import { PNG } from 'pngjs';
import type { FractionalBox } from './jev-image';
import { cropPng } from './rule-book';

/** One expected-vs-actual pair drawn onto a visual comparison PNG. */
export interface BookBoxComparisonEntry {
	index: number;
	expected?: FractionalBox;
	actual: FractionalBox;
}

/**
 * Renders a visual comparison PNG showing the book page with green (committed) and red (Jev)
 * bounding boxes beside side-by-side crops for each entry.
 */
export function renderBookBoxComparisonPng(
	pageImage: PNG,
	entries: readonly BookBoxComparisonEntry[],
): Buffer {
	const pad = 16;
	const pageTargetW = Math.min(640, pageImage.width);
	const pageScale = pageTargetW / pageImage.width;
	const pageTargetH = Math.max(1, Math.round(pageImage.height * pageScale));
	const sideTileW = 240;
	const sideTileH = 140;
	const sideGap = 12;
	const rowGap = 14;
	const hasExpected = entries.some((e) => e.expected !== undefined);
	const sideColW = hasExpected ? sideTileW * 2 + sideGap : sideTileW;
	const sideTotalH =
		entries.length > 0
			? entries.length * (sideTileH + 18) + (entries.length - 1) * rowGap
			: 0;
	const width = pad * 3 + pageTargetW + sideColW;
	const height = pad * 2 + Math.max(pageTargetH, sideTotalH);
	const canvas = new PNG({ width, height });
	canvas.data.fill(248);

	blitScaled(pageImage, canvas, pad, pad, pageTargetW, pageTargetH);
	drawRect(canvas, pad, pad, pageTargetW, pageTargetH, GRAY, 1);

	for (const entry of entries) {
		if (entry.expected) {
			const r = toScaledRect(
				entry.expected,
				pad,
				pad,
				pageTargetW,
				pageTargetH,
			);
			drawRect(canvas, r.x, r.y, r.w, r.h, GREEN, 3);
			drawBadge(canvas, r.x, Math.max(pad, r.y - 14), entry.index, GREEN);
		}
		const a = toScaledRect(entry.actual, pad, pad, pageTargetW, pageTargetH);
		drawRect(canvas, a.x, a.y, a.w, a.h, RED, 3, true);
		drawBadge(
			canvas,
			Math.min(pad + pageTargetW - 18, a.x + Math.max(0, a.w - 18)),
			Math.max(pad, a.y - 14),
			entry.index,
			RED,
		);
	}

	const sideX = pad * 2 + pageTargetW;
	let cursorY = pad;
	for (const entry of entries) {
		drawBadge(canvas, sideX, cursorY, entry.index, DARK);
		const tileY = cursorY + 18;
		if (hasExpected) {
			drawCropTile(
				canvas,
				pageImage,
				entry.expected,
				sideX,
				tileY,
				sideTileW,
				sideTileH,
				GREEN,
			);
			drawCropTile(
				canvas,
				pageImage,
				entry.actual,
				sideX + sideTileW + sideGap,
				tileY,
				sideTileW,
				sideTileH,
				RED,
			);
		} else {
			drawCropTile(
				canvas,
				pageImage,
				entry.actual,
				sideX,
				tileY,
				sideTileW,
				sideTileH,
				RED,
			);
		}
		cursorY += sideTileH + 18 + rowGap;
	}

	return PNG.sync.write(canvas);
}

type Rgb = readonly [number, number, number];
const GREEN: Rgb = [22, 163, 74];
const RED: Rgb = [220, 38, 38];
const DARK: Rgb = [30, 41, 59];
const GRAY: Rgb = [203, 213, 225];
const WHITE: Rgb = [255, 255, 255];

const DIGITS: Record<string, readonly string[]> = {
	'0': ['111', '101', '101', '101', '111'],
	'1': ['010', '110', '010', '010', '111'],
	'2': ['111', '001', '111', '100', '111'],
	'3': ['111', '001', '111', '001', '111'],
	'4': ['101', '101', '111', '001', '001'],
	'5': ['111', '100', '111', '001', '111'],
	'6': ['111', '100', '111', '101', '111'],
	'7': ['111', '001', '001', '010', '010'],
	'8': ['111', '101', '111', '101', '111'],
	'9': ['111', '101', '111', '001', '111'],
};

function drawCropTile(
	canvas: PNG,
	pageImage: PNG,
	box: FractionalBox | undefined,
	x: number,
	y: number,
	w: number,
	h: number,
	border: Rgb,
): void {
	fillRect(canvas, x, y, w, h, WHITE);
	const cropped = box ? cropPng(pageImage, box) : null;
	if (cropped) {
		const innerW = w - 8;
		const innerH = h - 8;
		const scale = Math.min(innerW / cropped.width, innerH / cropped.height);
		const dw = Math.max(1, Math.round(cropped.width * scale));
		const dh = Math.max(1, Math.round(cropped.height * scale));
		const dx = x + Math.floor((w - dw) / 2);
		const dy = y + Math.floor((h - dh) / 2);
		blitScaled(cropped.png, canvas, dx, dy, dw, dh);
	}
	drawRect(canvas, x, y, w, h, border, 3);
}

function drawBadge(
	canvas: PNG,
	x: number,
	y: number,
	num: number,
	bg: Rgb,
): void {
	const text = String(num);
	const badgeW = text.length * 8 + 6;
	const badgeH = 14;
	fillRect(canvas, x, y, badgeW, badgeH, bg);
	for (let i = 0; i < text.length; i++) {
		const glyph = DIGITS[text[i] ?? '0'] ?? DIGITS['0'];
		if (!glyph) {
			continue;
		}
		for (let gy = 0; gy < glyph.length; gy++) {
			const row = glyph[gy] ?? '';
			for (let gx = 0; gx < row.length; gx++) {
				if (row[gx] === '1') {
					fillRect(canvas, x + 3 + i * 8 + gx * 2, y + 2 + gy * 2, 2, 2, WHITE);
				}
			}
		}
	}
}

function toScaledRect(
	box: FractionalBox,
	ox: number,
	oy: number,
	w: number,
	h: number,
): { x: number; y: number; w: number; h: number } {
	return {
		x: ox + Math.round(box.x * w),
		y: oy + Math.round(box.y * h),
		w: Math.max(4, Math.round(box.w * w)),
		h: Math.max(4, Math.round(box.h * h)),
	};
}

function blitScaled(
	src: PNG,
	dst: PNG,
	dx: number,
	dy: number,
	dw: number,
	dh: number,
): void {
	for (let y = 0; y < dh; y++) {
		const sy = Math.min(src.height - 1, Math.floor((y * src.height) / dh));
		for (let x = 0; x < dw; x++) {
			const sx = Math.min(src.width - 1, Math.floor((x * src.width) / dw));
			const si = (sy * src.width + sx) * 4;
			const tx = dx + x;
			const ty = dy + y;
			if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) {
				continue;
			}
			const di = (ty * dst.width + tx) * 4;
			const alpha = (src.data[si + 3] ?? 255) / 255;
			for (let c = 0; c < 3; c++) {
				dst.data[di + c] = Math.round(
					(src.data[si + c] ?? 255) * alpha + 255 * (1 - alpha),
				);
			}
			dst.data[di + 3] = 255;
		}
	}
}

function fillRect(
	png: PNG,
	x: number,
	y: number,
	w: number,
	h: number,
	color: Rgb,
): void {
	for (let py = y; py < y + h; py++) {
		for (let px = x; px < x + w; px++) {
			setPixel(png, px, py, color);
		}
	}
}

function drawRect(
	png: PNG,
	x: number,
	y: number,
	w: number,
	h: number,
	color: Rgb,
	thickness: number,
	dashed = false,
): void {
	const x1 = x + w - 1;
	const y1 = y + h - 1;
	for (let px = x; px <= x1; px++) {
		if (dashed && Math.floor((px - x) / 6) % 2 === 1) {
			continue;
		}
		for (let t = 0; t < thickness; t++) {
			setPixel(png, px, y + t, color);
			setPixel(png, px, y1 - t, color);
		}
	}
	for (let py = y; py <= y1; py++) {
		if (dashed && Math.floor((py - y) / 6) % 2 === 1) {
			continue;
		}
		for (let t = 0; t < thickness; t++) {
			setPixel(png, x + t, py, color);
			setPixel(png, x1 - t, py, color);
		}
	}
}

function setPixel(png: PNG, x: number, y: number, color: Rgb): void {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
		return;
	}
	const i = (y * png.width + x) * 4;
	png.data[i] = color[0];
	png.data[i + 1] = color[1];
	png.data[i + 2] = color[2];
	png.data[i + 3] = 255;
}
