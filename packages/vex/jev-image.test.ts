import { expect, it } from 'bun:test';
import { Rect } from 'core/geometry';
import { PNG } from 'pngjs';
import {
	prepareJevImage,
	prepareJevImageWithTransform,
	unmapJevBox,
} from './jev-image';

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

it('unmaps boxes from downscaled full-page images back to original fractions', () => {
	const source = new PNG({ width: 1200, height: 1600 });
	const prepared = prepareJevImageWithTransform(PNG.sync.write(source));
	expect(prepared.transform).toEqual(
		expect.objectContaining({
			sourceWidth: 1200,
			sourceHeight: 1600,
			padX: 0,
			padY: 0,
			preparedWidth: 1176,
			preparedHeight: 1568,
		}),
	);

	const unmapped = unmapJevBox(
		{ left: 0.15, top: 0.25, right: 0.85, bottom: 0.55 },
		prepared.transform,
	);
	expect(unmapped.x).toBeCloseTo(0.15, 6);
	expect(unmapped.y).toBeCloseTo(0.25, 6);
	expect(unmapped.w).toBeCloseTo(0.7, 6);
	expect(unmapped.h).toBeCloseTo(0.3, 6);
});

it('unmaps boxes across vertical white padding and clamps spill into padding', () => {
	const source = new PNG({ width: 2000, height: 20 });
	const prepared = prepareJevImageWithTransform(PNG.sync.write(source));
	const { padY, scaledHeight, preparedHeight } = prepared.transform;
	expect(padY).toBeGreaterThan(0);

	const exactContent = unmapJevBox(
		{
			left: 0.25,
			right: 0.75,
			top: padY / preparedHeight,
			bottom: (padY + scaledHeight) / preparedHeight,
		},
		prepared.transform,
	);
	expect(exactContent.x).toBeCloseTo(0.25, 6);
	expect(exactContent.y).toBeCloseTo(0, 6);
	expect(exactContent.w).toBeCloseTo(0.5, 6);
	expect(exactContent.h).toBeCloseTo(1, 6);

	const spillingIntoPadding = unmapJevBox(
		{ left: 0.1, right: 0.9, top: 0, bottom: 1 },
		prepared.transform,
	);
	expect(spillingIntoPadding.y).toBe(0);
	expect(spillingIntoPadding.h).toBe(1);

	const insideTopPaddingOnly = unmapJevBox(
		{ left: 0.1, right: 0.9, top: 0, bottom: (padY - 10) / preparedHeight },
		prepared.transform,
	);
	expect(insideTopPaddingOnly.h).toBe(0);
});

it('unmaps boxes across horizontal white padding for tall narrow strips', () => {
	const source = new PNG({ width: 20, height: 2000 });
	const prepared = prepareJevImageWithTransform(PNG.sync.write(source));
	const { padX, scaledWidth, preparedWidth } = prepared.transform;
	expect(padX).toBeGreaterThan(0);

	const unmapped = unmapJevBox(
		{
			left: (padX + scaledWidth * 0.2) / preparedWidth,
			right: (padX + scaledWidth * 0.8) / preparedWidth,
			top: 0.1,
			bottom: 0.6,
		},
		prepared.transform,
	);
	expect(unmapped.x).toBeCloseTo(0.2, 6);
	expect(unmapped.w).toBeCloseTo(0.6, 6);
	expect(unmapped.y).toBeCloseTo(0.1, 6);
	expect(unmapped.h).toBeCloseTo(0.5, 6);
});

it('unmaps boxes from cropped sub-regions into full original-image fractions', () => {
	const source = new PNG({ width: 1000, height: 1000 });
	const prepared = prepareJevImageWithTransform(
		PNG.sync.write(source),
		new Rect(200, 300, 400, 200),
	);
	const unmapped = unmapJevBox(
		{ left: 0.5, top: 0.25, right: 1, bottom: 0.75 },
		prepared.transform,
	);
	expect(unmapped.x).toBeCloseTo(0.4, 6);
	expect(unmapped.y).toBeCloseTo(0.35, 6);
	expect(unmapped.w).toBeCloseTo(0.2, 6);
	expect(unmapped.h).toBeCloseTo(0.1, 6);
});
