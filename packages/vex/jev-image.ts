import type { Rect } from 'core/geometry';
import { PNG } from 'pngjs';
import type { JevBox } from './jev-client';

/** A rectangle in original-image fractions (0..1) from the top-left corner. */
export interface FractionalBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Records the crop, scale, and white-padding transform applied to prepare a Jev image. */
export interface JevImageTransform {
	sourceWidth: number;
	sourceHeight: number;
	cropX: number;
	cropY: number;
	cropWidth: number;
	cropHeight: number;
	scale: number;
	scaledWidth: number;
	scaledHeight: number;
	padX: number;
	padY: number;
	preparedWidth: number;
	preparedHeight: number;
}

/** A Jev-ready PNG alongside the transform needed to map returned boxes back to the original image. */
export interface PreparedJevImage {
	png: Buffer;
	transform: JevImageTransform;
}

/** Fits a crop within Jev's image limits, preserving aspect ratio and padding white. */
export function prepareJevImage(bytes: Buffer, box?: Rect): Buffer {
	return prepareJevImageWithTransform(bytes, box).png;
}

/** Fits a crop within Jev's image limits and records the transform to un-map box answers. */
export function prepareJevImageWithTransform(
	bytes: Buffer,
	box?: Rect,
): PreparedJevImage {
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
	return {
		png: PNG.sync.write(image),
		transform: {
			sourceWidth: source.width,
			sourceHeight: source.height,
			cropX: left,
			cropY: top,
			cropWidth: width,
			cropHeight: height,
			scale,
			scaledWidth: w,
			scaledHeight: h,
			padX: dx,
			padY: dy,
			preparedWidth: image.width,
			preparedHeight: image.height,
		},
	};
}

/** Maps a Jev box on a prepared image back into original-image fractional `x y w h` coordinates. */
export function unmapJevBox(
	box: JevBox,
	transform: JevImageTransform,
): FractionalBox {
	const sx0 = clamp(
		box.left * transform.preparedWidth - transform.padX,
		0,
		transform.scaledWidth,
	);
	const sx1 = clamp(
		box.right * transform.preparedWidth - transform.padX,
		0,
		transform.scaledWidth,
	);
	const sy0 = clamp(
		box.top * transform.preparedHeight - transform.padY,
		0,
		transform.scaledHeight,
	);
	const sy1 = clamp(
		box.bottom * transform.preparedHeight - transform.padY,
		0,
		transform.scaledHeight,
	);
	const x0 = clamp(
		(transform.cropX + (sx0 / transform.scaledWidth) * transform.cropWidth) /
			transform.sourceWidth,
		0,
		1,
	);
	const x1 = clamp(
		(transform.cropX + (sx1 / transform.scaledWidth) * transform.cropWidth) /
			transform.sourceWidth,
		0,
		1,
	);
	const y0 = clamp(
		(transform.cropY + (sy0 / transform.scaledHeight) * transform.cropHeight) /
			transform.sourceHeight,
		0,
		1,
	);
	const y1 = clamp(
		(transform.cropY + (sy1 / transform.scaledHeight) * transform.cropHeight) /
			transform.sourceHeight,
		0,
		1,
	);
	return {
		x: x0,
		y: y0,
		w: Math.max(0, x1 - x0),
		h: Math.max(0, y1 - y0),
	};
}

function clamp(value: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, value));
}
