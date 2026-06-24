import { afterAll, expect } from 'bun:test';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { createCanvas, createImageData } from 'canvas';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// [old][diff][new] side by side, each captioned, returned as a PNG buffer.
function composite(
	expected: PNG,
	diff: PNG,
	got: PNG,
	w: number,
	h: number,
): Buffer {
	const header = 16;
	const canvas = createCanvas(w * 3, h + header);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, w * 3, header);
	ctx.fillStyle = '#000';
	ctx.font = '12px sans-serif';
	const panels: [string, PNG][] = [
		['old', expected],
		['diff', diff],
		['new', got],
	];
	panels.forEach(([label, png], i) => {
		ctx.fillText(label, i * w + 4, 12);
		const img = createImageData(w, h);
		img.data.set(png.data);
		ctx.putImageData(img, i * w, header);
	});
	return canvas.toBuffer('image/png');
}

// Local (host) runs override this so host pixels don't diff against the committed Docker baselines.
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR
	? path.resolve(process.env.SCREENSHOTS_DIR)
	: path.resolve(import.meta.dir, '../integration/__screenshots__');
const DIFF_DIR = path.resolve(import.meta.dir, '../integration/__diffs__');
const UPDATE = process.env.UPDATE_SCREENSHOTS === '1';

// Every diff written this run; stale ones are whatever's left over in DIFF_DIR.
const seenDiffs = new Set<string>();
afterAll(() => {
	if (!existsSync(DIFF_DIR)) {
		return;
	}
	for (const f of readdirSync(DIFF_DIR)) {
		if (f.endsWith('.png') && !seenDiffs.has(f)) {
			rmSync(path.join(DIFF_DIR, f));
			console.log(`removed stale diff ${f}`);
		}
	}
	if (readdirSync(DIFF_DIR).length === 0) {
		rmSync(DIFF_DIR, { recursive: true });
	}
});

// Every baseline touched this run; orphans are whatever's left over in SNAP_DIR.
const seen = new Set<string>();
if (process.env.CLEANUP_ORPHANED_SCREENSHOTS === '1') {
	afterAll(() => {
		let removed = 0;
		if (existsSync(SCREENSHOTS_DIR)) {
			for (const f of readdirSync(SCREENSHOTS_DIR)) {
				if (f.endsWith('.png') && !seen.has(f)) {
					rmSync(path.join(SCREENSHOTS_DIR, f));
					console.log(`removed orphaned screenshot ${f}`);
					removed++;
				}
			}
		}
		if (removed === 0) {
			console.log('no orphaned screenshots to clean');
		}
	});
}

expect.extend({
	/** Diff a screenshot against its baseline; record when missing or UPDATE_SCREENSHOTS=1. */
	toMatchScreenshot(received: unknown, filename: string) {
		const buf = received as Buffer;
		seen.add(filename);
		const baseline = path.join(SCREENSHOTS_DIR, filename);

		if (UPDATE || !existsSync(baseline)) {
			mkdirSync(SCREENSHOTS_DIR, { recursive: true });
			writeFileSync(baseline, buf);
			return { pass: true, message: () => `wrote baseline ${filename}` };
		}

		const expected = PNG.sync.read(readFileSync(baseline));
		const got = PNG.sync.read(buf);

		if (got.width !== expected.width || got.height !== expected.height) {
			return {
				pass: false,
				message: () =>
					`${filename}: size ${got.width}x${got.height} != baseline ${expected.width}x${expected.height}`,
			};
		}

		const diff = new PNG({ width: expected.width, height: expected.height });
		const mismatch = pixelmatch(
			expected.data,
			got.data,
			diff.data,
			expected.width,
			expected.height,
			{ threshold: 0.01 },
		);

		if (mismatch > 0) {
			seenDiffs.add(filename);
			mkdirSync(DIFF_DIR, { recursive: true });
			writeFileSync(
				path.join(DIFF_DIR, filename),
				composite(expected, diff, got, expected.width, expected.height),
			);
			return {
				pass: false,
				message: () =>
					`${filename}: ${mismatch} pixels differ — see __diffs__/${filename}`,
			};
		}

		return { pass: true, message: () => `${filename} matches baseline` };
	},
});

declare module 'bun:test' {
	interface Matchers {
		toMatchScreenshot(filename: string): void;
	}
}
