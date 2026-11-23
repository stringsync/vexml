import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { PNG } from 'pngjs';

const NAME = 'screenshot_size_mismatch_fixture.png';
const baseline = path.resolve(import.meta.dir, '__screenshots__', NAME);
const diffs = path.resolve(import.meta.dir, '__diffs__');

function solid(width: number, height: number): Buffer {
	const png = new PNG({ width, height });
	png.data.fill(255);
	return PNG.sync.write(png);
}

describe('toMatchScreenshot', () => {
	afterEach(() => {
		for (const f of [
			baseline,
			path.join(diffs, NAME),
			path.join(diffs, NAME.replace('.png', '.json')),
		]) {
			rmSync(f, { force: true });
		}
	});

	it('records a diff and sidecar when the size differs from the baseline', () => {
		writeFileSync(baseline, solid(20, 10));

		expect(solid(30, 40)).not.toMatchScreenshot(NAME);

		expect(existsSync(path.join(diffs, NAME))).toBe(true);
		const sidecar = JSON.parse(
			readFileSync(path.join(diffs, NAME.replace('.png', '.json')), 'utf8'),
		);
		expect(sidecar.width).toBe(30);
		expect(sidecar.height).toBe(40);
		expect(sidecar.mismatch).toBeGreaterThan(0);
		const composite = PNG.sync.read(readFileSync(path.join(diffs, NAME)));
		expect(composite.width).toBe(90);
	});
});
