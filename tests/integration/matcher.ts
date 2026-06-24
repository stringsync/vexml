import { expect } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// Local (host) runs override this so host pixels don't diff against the committed Docker baselines.
const SNAP_DIR = process.env.SCREENSHOTS_DIR
	? path.resolve(process.env.SCREENSHOTS_DIR)
	: path.resolve(import.meta.dir, '__screenshots__');
const DIFF_DIR = path.resolve(import.meta.dir, '__diffs__');
const UPDATE = process.env.UPDATE_SCREENSHOTS === '1';

expect.extend({
	/** Diff a screenshot against its baseline; record when missing or UPDATE_SCREENSHOTS=1. */
	toMatchBaseline(received: unknown, name: string) {
		const buf = received as Buffer;
		const baseline = path.join(SNAP_DIR, `${name}.png`);

		if (UPDATE || !existsSync(baseline)) {
			mkdirSync(SNAP_DIR, { recursive: true });
			writeFileSync(baseline, buf);
			return { pass: true, message: () => `wrote baseline ${name}.png` };
		}

		const expected = PNG.sync.read(readFileSync(baseline));
		const got = PNG.sync.read(buf);

		if (got.width !== expected.width || got.height !== expected.height) {
			return {
				pass: false,
				message: () =>
					`${name}: size ${got.width}x${got.height} != baseline ${expected.width}x${expected.height}`,
			};
		}

		const diff = new PNG({ width: expected.width, height: expected.height });
		const mismatch = pixelmatch(
			expected.data,
			got.data,
			diff.data,
			expected.width,
			expected.height,
			{ threshold: 0.1 },
		);

		if (mismatch > 0) {
			mkdirSync(DIFF_DIR, { recursive: true });
			writeFileSync(path.join(DIFF_DIR, `${name}.png`), PNG.sync.write(diff));
			return {
				pass: false,
				message: () =>
					`${name}: ${mismatch} pixels differ — see __diffs__/${name}.png`,
			};
		}

		return { pass: true, message: () => `${name} matches baseline` };
	},
});

declare module 'bun:test' {
	interface Matchers {
		toMatchBaseline(name: string): void;
	}
}
