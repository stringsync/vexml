// Crops Behind Bars examples from the user's local prepared book directory (`VEXML_BOOK_DIR`,
// default `~/Books/behind-bars`) at review time only, measuring the stave's staff-space height
// so the rules strip can show the book tile at the same staff-space scale as vexml.
// Self-contained: never imports `@vexml/book`, which stays out of the public mirror.

import * as path from 'node:path';
import type { Fs, Ps } from 'core/system';
import { PNG } from 'pngjs';
import { z } from 'zod';
import type { FractionalBox } from './jev-image';
import type { RuleBookBox } from './rule-checks';

const bookIndexSchema = z.object({
	pages: z.array(
		z.object({
			pdf: z.number().int().positive(),
			label: z.string().nullable(),
		}),
	),
});

/** Default directory where `bin/book prepare` stores Behind Bars outside the repo. */
export function resolveBookDir(ps: Ps): string {
	return (
		ps.env('VEXML_BOOK_DIR') ??
		path.join(ps.env('HOME') ?? '', 'Books', 'behind-bars')
	);
}

/** A cropped Behind Bars example ready to serve as a PNG, with its measured staff space. */
export interface BookCropResult {
	png: Buffer;
	width: number;
	height: number;
	/** Pixels per staff space in the crop. */
	space: number;
}

/** A decoded Behind Bars print page together with its raw PNG bytes. */
export interface BookPageImage {
	png: Buffer;
	image: PNG;
}

/** A cropped PNG from a Behind Bars page, with its raw five-line stave detection result. */
export interface RawBookCrop {
	png: PNG;
	width: number;
	height: number;
	/** Detected pixels per staff space, or null when no five-line stave stands out. */
	detectedSpace: number | null;
}

/** Crops a fractional box from a decoded Behind Bars page PNG and checks for a five-line stave. */
export function cropPng(image: PNG, box: FractionalBox): RawBookCrop | null {
	const x = clamp(Math.floor(box.x * image.width), 0, image.width);
	const y = clamp(Math.floor(box.y * image.height), 0, image.height);
	const w = clamp(Math.ceil((box.x + box.w) * image.width), 0, image.width) - x;
	const h =
		clamp(Math.ceil((box.y + box.h) * image.height), 0, image.height) - y;
	if (w <= 0 || h <= 0) {
		return null;
	}
	const out = new PNG({ width: w, height: h });
	PNG.bitblt(image, out, x, y, w, h, 0, 0);
	return {
		png: out,
		width: w,
		height: h,
		detectedSpace: detectStaffSpace(out),
	};
}

/**
 * Loads `index.json` and page PNGs from a prepared book directory on demand, caching decoded
 * pages for the life of one strip. Returns null from `crop` when the book or
 * requested print page is unavailable.
 */
export class BookCropper {
	private pageMapPromise: Promise<Map<string, number> | null> | null = null;
	private readonly pages = new Map<number, Promise<BookPageImage | null>>();

	constructor(
		private readonly fs: Fs,
		private readonly bookDir: string,
	) {}

	/** Reads and caches a prepared print page's raw PNG bytes and decoded image, or null when missing. */
	async readPage(page: string): Promise<BookPageImage | null> {
		const pageMap = await this.loadPageMap();
		const pdf = pageMap?.get(page.toLowerCase());
		if (pdf === undefined) {
			return null;
		}
		return this.loadPage(pdf);
	}

	async crop(box: RuleBookBox): Promise<BookCropResult | null> {
		const page = await this.readPage(box.page);
		if (!page) {
			return null;
		}
		const cropped = cropPng(page.image, box);
		if (!cropped) {
			return null;
		}
		const space = cropped.detectedSpace ?? Math.max(1, cropped.height / 8);
		return {
			png: PNG.sync.write(cropped.png),
			width: cropped.width,
			height: cropped.height,
			space,
		};
	}

	private loadPageMap(): Promise<Map<string, number> | null> {
		if (!this.pageMapPromise) {
			this.pageMapPromise = (async () => {
				const indexPath = path.join(this.bookDir, 'index.json');
				if (!(await this.fs.exists(indexPath))) {
					return null;
				}
				try {
					const parsed = bookIndexSchema.safeParse(
						JSON.parse(await this.fs.read(indexPath)),
					);
					if (!parsed.success) {
						return null;
					}
					const map = new Map<string, number>();
					for (const p of parsed.data.pages) {
						if (p.label) {
							map.set(p.label.toLowerCase(), p.pdf);
						}
					}
					return map;
				} catch {
					return null;
				}
			})();
		}
		return this.pageMapPromise;
	}

	private loadPage(pdf: number): Promise<BookPageImage | null> {
		let pending = this.pages.get(pdf);
		if (!pending) {
			pending = (async () => {
				const file = path.join(
					this.bookDir,
					'pages',
					`page-${String(pdf).padStart(3, '0')}.png`,
				);
				if (!(await this.fs.exists(file))) {
					return null;
				}
				try {
					const png = Buffer.from(await this.fs.readBytes(file));
					return { png, image: PNG.sync.read(png) };
				} catch {
					return null;
				}
			})();
			this.pages.set(pdf, pending);
		}
		return pending;
	}
}

/**
 * Estimates the vertical staff-space height (in pixels) of a five-line stave in a scanned
 * music example by matching a five-tooth comb to the crop's horizontal darkness profile.
 * Returns null when no five-line stave stands out.
 */
export function detectStaffSpace(png: PNG): number | null {
	const { width, height, data } = png;
	if (width < 8 || height < 20) {
		return null;
	}
	// Fraction of dark pixels per row; staff lines span horizontally across the crop.
	const rowDark = new Float64Array(height);
	for (let y = 0; y < height; y++) {
		let dark = 0;
		const rowOffset = y * width * 4;
		for (let x = 0; x < width; x++) {
			const i = rowOffset + x * 4;
			const lum =
				0.299 * (data[i] ?? 255) +
				0.587 * (data[i + 1] ?? 255) +
				0.114 * (data[i + 2] ?? 255);
			if (lum < 200) {
				dark += 1;
			}
		}
		rowDark[y] = dark / width;
	}

	const maxSpace = Math.min(40, (height - 2) / 4);
	let bestScore = 0;
	let bestSpace: number | null = null;
	let bestTop = 0;

	for (let s = 4; s <= maxSpace; s += 0.25) {
		const maxTop = height - 1 - 4 * s;
		for (let y0 = 0; y0 <= maxTop; y0 += 0.5) {
			let lineSum = 0;
			let minLine = 1;
			for (let k = 0; k < 5; k++) {
				const v = samplePeak(rowDark, y0 + k * s);
				lineSum += v;
				if (v < minLine) {
					minLine = v;
				}
			}
			// Every staff line must carry horizontal ink across a meaningful share of the crop.
			if (minLine < 0.25) {
				continue;
			}
			let midSum = 0;
			for (let k = 0; k < 4; k++) {
				midSum += sampleRow(rowDark, y0 + (k + 0.5) * s);
			}
			const score = 2 * minLine + lineSum - 1.5 * midSum;
			if (score > bestScore) {
				bestScore = score;
				bestSpace = s;
				bestTop = y0;
			}
		}
	}

	if (bestSpace === null) {
		return null;
	}

	// Refine each of the five line centres to its local peak within ±0.35 * space, then fit a line.
	const radius = Math.max(1, Math.floor(bestSpace * 0.35));
	const centers: number[] = [];
	for (let k = 0; k < 5; k++) {
		const approx = Math.round(bestTop + k * bestSpace);
		const lo = Math.max(0, approx - radius);
		const hi = Math.min(height - 1, approx + radius);
		let peakY = approx;
		let peakV = -1;
		for (let y = lo; y <= hi; y++) {
			if ((rowDark[y] ?? 0) > peakV) {
				peakV = rowDark[y] ?? 0;
				peakY = y;
			}
		}
		// Weighted centroid around the peak row for sub-pixel accuracy.
		let num = 0;
		let den = 0;
		for (
			let y = Math.max(0, peakY - 1);
			y <= Math.min(height - 1, peakY + 1);
			y++
		) {
			const w = rowDark[y] ?? 0;
			num += y * w;
			den += w;
		}
		centers.push(den > 0 ? num / den : peakY);
	}
	const refined = ((centers[4] ?? 0) - (centers[0] ?? 0)) / 4;
	return refined > 3 ? Number(refined.toFixed(2)) : bestSpace;
}

function sampleRow(profile: Float64Array, y: number): number {
	const i = Math.floor(y);
	const t = y - i;
	const a = profile[i] ?? 0;
	const b = profile[i + 1] ?? a;
	return a + (b - a) * t;
}

function samplePeak(profile: Float64Array, y: number): number {
	const c = Math.round(y);
	return Math.max(profile[c - 1] ?? 0, profile[c] ?? 0, profile[c + 1] ?? 0);
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}
