import type { Image } from "./image";

export interface ResizeOptions {
	/** Keep the source aspect ratio, fitting inside the box. */
	preserveAspect?: boolean;
	/** Resampling filter used when scaling. */
	filter?: "nearest" | "bilinear" | "lanczos";
}

export function resize(
	image: Image,
	width: number,
	height: number,
	opts: ResizeOptions = {},
): Image {
	const filter = opts.filter ?? "bilinear";
	if (opts.preserveAspect) {
		const scale = Math.min(width / image.width, height / image.height);
		return image.scale(image.width * scale, image.height * scale, filter);
	}
	return image.scale(width, height, filter);
}
