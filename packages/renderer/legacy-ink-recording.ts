import { CanvasContext } from 'vexflow/core';
import { Affine } from '../vexml/affine';
import { CanvasPaintProbe } from '../vexml/canvas-paint-probe';
import { PaintContext } from '../vexml/paint-context';
import { PaintList } from '../vexml/paint-list';
import { PaintReplayer } from '../vexml/paint-replayer';
import type { InkMask } from './ink-mask';
import { PaintInkMasks } from './paint-ink-masks';

/** Record an archived renderer through context, then call finish() with its crop top
 * to paint the scratch canvas and expose the element masks. */
export class LegacyInkRecording {
	static masks: InkMask[] = [];
	readonly context: CanvasContext;
	private readonly list = new PaintList();
	private readonly recorder: PaintContext;

	constructor(private readonly scratch: HTMLCanvasElement) {
		const probe = document.createElement('canvas').getContext('2d');
		if (!probe) {
			throw new Error('legacy ink capture: no probe context');
		}
		this.recorder = new PaintContext(
			this.list,
			new CanvasPaintProbe(probe),
			null,
		);
		this.context = new CanvasContext(
			this.recorder as unknown as CanvasRenderingContext2D,
		);
		this.context.openGroup = (kind) => this.list.openGroup(kind ?? 'element');
		this.context.closeGroup = () => this.list.closeGroup();
	}

	reset(): void {
		this.recorder.reset();
	}

	finish(cropTop: number): void {
		const dpr = this.scratch.width / parseFloat(this.scratch.style.width);
		const context = this.scratch.getContext('2d');
		if (!context) {
			throw new Error('legacy ink capture: no output context');
		}
		const replay = new PaintReplayer(context, Affine.scale(dpr), {
			scale: dpr,
			device: null,
		});
		for (const op of this.list.ops) {
			replay.replay(op);
		}
		replay.finish();
		LegacyInkRecording.masks = new PaintInkMasks(
			this.list.ops,
			new Affine(dpr, 0, 0, dpr, 16, 16 - Math.round(cropTop * dpr)),
			dpr,
		).capture();
	}
}
