import { PNG } from 'pngjs';
import type { Rect } from 'webappwiz/geometry';

/** Fits a crop within Jev's image limits, preserving aspect ratio and padding white. */
export function prepareJevImage(bytes: Buffer, box?: Rect): Buffer {
	const source = PNG.sync.read(bytes);
	const left = Math.max(0, Math.floor(box?.x ?? 0));
	const top = Math.max(0, Math.floor(box?.y ?? 0));
	const width =
		Math.min(source.width, Math.ceil(box?.right ?? source.width)) - left;
	const height =
		Math.min(source.height, Math.ceil(box?.bottom ?? source.height)) - top;
	if (width <= 0 || height <= 0) {
		throw new Error('empty Jev image crop');
	}
	const scale = Math.min(
		1568 / Math.max(width, height),
		Math.max(1, 280 / Math.min(width, height)),
	);
	const w = Math.max(1, Math.floor(width * scale));
	const h = Math.max(1, Math.floor(height * scale));
	const image = new PNG({
		width: Math.max(280, w),
		height: Math.max(280, h),
	});
	image.data.fill(255);
	const dx = Math.floor((image.width - w) / 2);
	const dy = Math.floor((image.height - h) / 2);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const from =
				((top + Math.min(height - 1, Math.floor(y / scale))) * source.width +
					left +
					Math.min(width - 1, Math.floor(x / scale))) *
				4;
			const to = ((y + dy) * image.width + x + dx) * 4;
			const alpha = (source.data[from + 3] ?? 0) / 255;
			for (let c = 0; c < 3; c++) {
				image.data[to + c] = Math.round(
					(source.data[from + c] ?? 0) * alpha + 255 * (1 - alpha),
				);
			}
		}
	}
	return PNG.sync.write(image);
}
