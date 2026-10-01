import type { PaintOp } from './paint-op';
import type { PaintSink } from './paint-sink';

/* A sink that only keeps the ops, in order: what the engraving is drawn into before its final
 * size and crop are known, then loaded into a surface whole. */
export class PaintList implements PaintSink {
	readonly scale = 1;
	readonly ops: PaintOp[] = [];

	paint(op: PaintOp): void {
		this.ops.push(op);
	}

	read(): ImageData {
		throw new Error(
			'vexml: the engraving cannot be read back while it is drawn',
		);
	}

	reset(): void {
		this.ops.length = 0;
	}
}
