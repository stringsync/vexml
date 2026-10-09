import { Affine } from './affine';
import type { Fold } from './fold';
import type { PaintOp } from './paint-op';
import { PaintReplayer } from './paint-replayer';

/*
 * A fold whose strips were recorded rather than engraved on demand: what a score rendered from a
 * snapshot pins, since engraving a strip (SignatureFold) needs the document. Each strip's ops are
 * in score space and replay under whatever transform the caller set.
 */
export class RecordedFold implements Fold {
	constructor(
		readonly left: number,
		readonly width: number,
		readonly height: number,
		readonly starts: readonly number[],
		private readonly strips: ReadonlyArray<readonly PaintOp[]>,
	) {}

	indexAt(x: number): number {
		let index = 0;
		for (const [i, start] of this.starts.entries()) {
			if (start > x) {
				break;
			}
			index = i;
		}
		return index;
	}

	paint(context: CanvasRenderingContext2D, index: number): void {
		const strip = this.strips[index];
		if (!strip) {
			return;
		}
		const m = context.getTransform();
		const replayer = new PaintReplayer(
			context,
			new Affine(m.a, m.b, m.c, m.d, m.e, m.f),
			{ scale: Math.hypot(m.a, m.b), device: null },
		);
		for (const op of strip) {
			replayer.replay(op);
		}
		replayer.finish();
	}
}
