/** One element's opaque ink, cropped in capture pixels. Runs are [offset, length] pairs
 * in the cropped bitmap, so a mostly empty staff or spanner costs only its actual ink. */
export interface InkMask {
	id: number;
	kind: string;
	parent?: number;
	ancestors?: readonly number[];
	x: number;
	y: number;
	width: number;
	height: number;
	runs: number[];
}
