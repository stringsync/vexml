import { expect, it } from 'bun:test';
import { Rect } from 'core/geometry';
import { PNG } from 'pngjs';
import { prepareJevImage } from './jev-image';

it('upscales small transparent images onto white', () => {
	const source = new PNG({ width: 40, height: 20 });
	const result = PNG.sync.read(prepareJevImage(PNG.sync.write(source)));
	expect([result.width, result.height]).toEqual([560, 280]);
	expect([...result.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
});

it('pads extreme aspect ratios without exceeding the maximum side', () => {
	const source = new PNG({ width: 2000, height: 20 });
	const result = PNG.sync.read(prepareJevImage(PNG.sync.write(source)));
	expect([result.width, result.height]).toEqual([1568, 280]);
});

it('crops before scaling and retains opaque ink', () => {
	const source = new PNG({ width: 100, height: 100 });
	source.data.fill(255);
	source.data.set([0, 0, 0, 255], (20 * 100 + 10) * 4);
	const result = PNG.sync.read(
		prepareJevImage(PNG.sync.write(source), new Rect(10, 20, 20, 20)),
	);
	expect([result.width, result.height]).toEqual([280, 280]);
	expect([...result.data.subarray(0, 4)]).toEqual([0, 0, 0, 255]);
});
