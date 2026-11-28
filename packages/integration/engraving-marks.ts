import { createCanvas, createImageData } from 'canvas';
import { PNG } from 'pngjs';

export interface MarkPoint {
	x: number;
	y: number;
}

export type EngravingMarkKind = 'bracket' | 'line' | 'box';
export type EngravingMarkRole = 'measure' | 'reference';

/** One visual annotation drawn over an engraving check's screenshot. */
export interface EngravingMark {
	kind: EngravingMarkKind;
	role: EngravingMarkRole;
	/** Start point (top-left for 'box'). */
	from: MarkPoint;
	/** End point (bottom-right for 'box'). */
	to: MarkPoint;
	/** Short label drawn on the image (e.g. '3½', 'middle line'). */
	label: string;
	/** One-line "look for" note for a reviewer. */
	note?: string;
	/** Whether the measurement passed; omitted on reference lines. */
	pass?: boolean;
}

/** What a check writes to `engraving_<rule>.marks.json`, in screenshot pixels. */
export interface EngravingMarksFile {
	/** Baseline screenshot filename this overlays (e.g. 'engraving_stem-length.png'). */
	screenshot: string;
	width: number;
	height: number;
	marks: EngravingMark[];
}

/** Collects score-space measurement and reference marks during an engraving check. */
export class EngravingMarks {
	private readonly items: EngravingMark[] = [];
	private readonly referenceKeys = new Set<string>();

	/** Records a measurement mark in score space. */
	measure(mark: Omit<EngravingMark, 'role'>): void {
		this.items.push({ ...mark, role: 'measure' });
	}

	/** Records a deduplicated reference line or box in score space. */
	reference(key: string, mark: Omit<EngravingMark, 'role' | 'pass'>): void {
		if (this.referenceKeys.has(key)) {
			return;
		}
		this.referenceKeys.add(key);
		this.items.push({ ...mark, role: 'reference' });
	}

	/** All recorded marks, shifted from score space into screenshot pixels. */
	toScreenshot(shift: MarkPoint): EngravingMark[] {
		return this.items.map((mark) => ({
			...mark,
			from: shiftPoint(mark.from, shift),
			to: shiftPoint(mark.to, shift),
		}));
	}
}

/** Formats a stave-space count using vulgar fractions for quarters (e.g. 3.5 -> '3½'). */
export function formatSpaces(spaces: number): string {
	const sign = spaces < 0 ? '-' : '';
	const abs = Math.abs(spaces);
	const whole = Math.floor(abs);
	const frac = Math.round((abs - whole) * 4);
	if (Math.abs(abs - (whole + frac / 4)) > 1e-6) {
		return String(spaces);
	}
	if (frac === 4) {
		return `${sign}${whole + 1}`;
	}
	const glyph = QUARTER_FRACTIONS[frac] ?? '';
	if (!glyph) {
		return `${sign}${whole}`;
	}
	return whole === 0 ? `${sign}${glyph}` : `${sign}${whole}${glyph}`;
}

/** Draws marks onto a copy of the screenshot PNG and returns the marked PNG bytes. */
export function renderMarkedImage(png: Buffer, marks: EngravingMark[]): Buffer {
	const decoded = PNG.sync.read(png);
	const { width, height } = decoded;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	const img = createImageData(width, height);
	img.data.set(decoded.data);
	ctx.putImageData(img, 0, 0);

	// Draw reference lines underneath measurement brackets so measurements stay legible.
	const ordered = [
		...marks.filter((m) => m.role === 'reference'),
		...marks.filter((m) => m.role === 'measure'),
	];
	for (const mark of ordered) {
		drawMark(ctx, mark, width, height);
	}
	return canvas.toBuffer('image/png');
}

const QUARTER_FRACTIONS: Record<number, string> = {
	1: '¼',
	2: '½',
	3: '¾',
};

const COLORS = {
	pass: '#15803d',
	fail: '#dc2626',
	reference: '#1d4ed8',
	halo: 'rgba(255, 255, 255, 0.88)',
} as const;

const CAP_HALF = 3.5;
const LABEL_PAD = 4;

function shiftPoint(point: MarkPoint, shift: MarkPoint): MarkPoint {
	return {
		x: roundTenth(point.x + shift.x),
		y: roundTenth(point.y + shift.y),
	};
}

function roundTenth(value: number): number {
	return Math.round(value * 10) / 10;
}

function markColor(mark: EngravingMark): string {
	if (mark.role === 'reference') {
		return COLORS.reference;
	}
	return mark.pass === false ? COLORS.fail : COLORS.pass;
}

function drawMark(
	ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
	mark: EngravingMark,
	width: number,
	height: number,
): void {
	const color = markColor(mark);
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineCap = 'butt';

	if (mark.kind === 'line') {
		drawLine(ctx, mark, width, height);
	} else if (mark.kind === 'bracket') {
		drawBracket(ctx, mark, width, height);
	} else {
		drawBox(ctx, mark, width, height);
	}
	ctx.restore();
}

function drawLine(
	ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
	mark: EngravingMark,
	width: number,
	height: number,
): void {
	const horizontal = Math.abs(mark.to.y - mark.from.y) < 0.5;
	const y1 = horizontal ? Math.round(mark.from.y) + 0.5 : mark.from.y;
	const y2 = horizontal ? y1 : mark.to.y;
	ctx.lineWidth = mark.role === 'reference' ? 1 : 1.5;
	ctx.beginPath();
	ctx.moveTo(mark.from.x, y1);
	ctx.lineTo(mark.to.x, y2);
	ctx.stroke();

	if (!mark.label) {
		return;
	}
	if (mark.role === 'reference' && horizontal) {
		ctx.font = '9.5px "Source Sans 3", sans-serif';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';
		const x = Math.min(
			width - LABEL_PAD,
			Math.max(mark.from.x, mark.to.x) - 12,
		);
		const y = Math.min(height - 12, y1 + 0.5);
		drawLabel(ctx, mark.label, x, y);
		return;
	}
	ctx.font = '11px "Source Sans 3", sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'bottom';
	const mx = (mark.from.x + mark.to.x) / 2;
	const my = Math.min(mark.from.y, mark.to.y) - 4;
	drawLabel(ctx, mark.label, clamp(mx, 20, width - 20), Math.max(14, my));
}

function drawBracket(
	ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
	mark: EngravingMark,
	width: number,
	height: number,
): void {
	const dx = mark.to.x - mark.from.x;
	const dy = mark.to.y - mark.from.y;
	const len = Math.hypot(dx, dy);
	const vertical = Math.abs(dy) >= Math.abs(dx);
	const fx = vertical ? Math.round(mark.from.x) + 0.5 : mark.from.x;
	const tx = vertical ? fx : mark.to.x;
	const fy = vertical ? mark.from.y : Math.round(mark.from.y) + 0.5;
	const ty = vertical ? mark.to.y : fy;

	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(fx, fy);
	ctx.lineTo(tx, ty);
	if (len > 0) {
		const px = (-dy / len) * CAP_HALF;
		const py = (dx / len) * CAP_HALF;
		ctx.moveTo(fx - px, fy - py);
		ctx.lineTo(fx + px, fy + py);
		ctx.moveTo(tx - px, ty - py);
		ctx.lineTo(tx + px, ty + py);
	}
	ctx.stroke();

	if (!mark.label) {
		return;
	}
	ctx.font = '600 11px "Source Sans 3", sans-serif';
	ctx.textAlign = 'center';
	if (vertical) {
		const down = dy >= 0;
		ctx.textBaseline = down ? 'top' : 'bottom';
		const y = down ? Math.min(height - 14, ty + 3) : Math.max(14, ty - 3);
		drawLabel(ctx, mark.label, clamp(tx, 16, width - 16), y);
		return;
	}
	ctx.textBaseline = 'bottom';
	const mx = (fx + tx) / 2;
	const my = Math.max(14, Math.min(fy, ty) - 4);
	drawLabel(ctx, mark.label, clamp(mx, 16, width - 16), my);
}

function drawBox(
	ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
	mark: EngravingMark,
	width: number,
	height: number,
): void {
	const x = Math.min(mark.from.x, mark.to.x);
	const y = Math.min(mark.from.y, mark.to.y);
	const w = Math.abs(mark.to.x - mark.from.x);
	const h = Math.abs(mark.to.y - mark.from.y);
	ctx.lineWidth = 1.5;
	ctx.strokeRect(x + 0.5, y + 0.5, w, h);

	if (!mark.label) {
		return;
	}
	ctx.font = '600 11px "Source Sans 3", sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'bottom';
	const ly = y > 16 ? y - 3 : Math.min(height - 4, y + h + 13);
	drawLabel(ctx, mark.label, clamp(x, LABEL_PAD, width - 40), ly);
}

function drawLabel(
	ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
	text: string,
	x: number,
	y: number,
): void {
	const color = ctx.fillStyle;
	ctx.save();
	ctx.lineJoin = 'round';
	ctx.lineWidth = 3;
	ctx.strokeStyle = COLORS.halo;
	ctx.strokeText(text, x, y);
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
	ctx.restore();
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
