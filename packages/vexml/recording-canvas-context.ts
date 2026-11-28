import { CanvasContext } from 'vexflow/core';
import type { PaintContext } from './paint-context';
import type { PaintList } from './paint-list';

/** A CanvasContext over a recording {@link PaintContext} that keeps VexFlow's notation groups.
 * CanvasContext discards them; recorded on the list, diagnostic mask replays can separate
 * elements without changing paint. */
export class RecordingCanvasContext extends CanvasContext {
	constructor(
		paint: PaintContext,
		private readonly list: PaintList,
	) {
		super(paint as unknown as CanvasRenderingContext2D);
	}

	override openGroup(cls?: string): undefined {
		return this.list.openGroup(cls ?? 'element');
	}

	override closeGroup(): void {
		this.list.closeGroup();
	}
}
