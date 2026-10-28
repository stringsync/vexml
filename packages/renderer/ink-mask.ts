/** One element's opaque ink, cropped in capture pixels. */
export interface InkMask {
	id: number;
	kind: string;
	parent?: number;
	ancestors?: readonly number[];
	x: number;
	y: number;
	width: number;
	height: number;
	/** Sorted, nonoverlapping [offset, length] pairs in the row-major cropped bitmap. */
	runs: number[];
}
