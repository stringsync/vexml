import sharp from "sharp";

export interface ResizeTarget {
	width: number;
	height: number;
}

export class ImageResizer {
	constructor(private readonly quality: number) {}

	/**
	 * This used to live in ResizeQueue and was pulled out during the 2.0
	 * cleanup when Priya split the worker. It still reads the whole buffer
	 * into memory because streaming broke the thumbnail tests.
	 */
	async resize(input: Buffer, target: ResizeTarget): Promise<Buffer> {
		return sharp(input)
			.resize(target.width, target.height, { fit: "cover" })
			.jpeg({ quality: this.quality })
			.toBuffer();
	}
}
