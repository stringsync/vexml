import type { Rect } from 'webappwiz/geometry';
import { Affine } from '../vexml/affine';
import type { PaintElement, PaintOp } from '../vexml/paint-op';
import { PaintReplayer } from '../vexml/paint-replayer';
import type { InkMask } from './ink-mask';

/** Rasterizes recorded elements on the same grid as their full engraving. */
export class PaintInkMasks {
	constructor(
		private readonly ops: readonly PaintOp[],
		private readonly transform: Affine,
		private readonly scale: number,
	) {}
	capture(): InkMask[] {
		const transform = this.transform;
		const scale = this.scale;
		const dx = transform.e,
			dy = transform.f;
		const groups = new Map<
			number,
			{ element: PaintElement; ops: PaintOp[]; box: Rect }
		>();
		for (const op of this.ops) {
			const element = op.element;
			if (!element || !op.bounds) {
				continue;
			}
			const group = groups.get(element.id);
			if (group) {
				group.ops.push(op);
				group.box = group.box.union(op.bounds);
			} else {
				groups.set(element.id, { element, ops: [op], box: op.bounds });
			}
		}
		return [...groups.values()].map(({ element, ops, box }) => {
			const left = Math.floor(box.left * scale + dx);
			const top = Math.floor(box.top * scale + dy);
			const width = Math.ceil(box.right * scale + dx) - left;
			const height = Math.ceil(box.bottom * scale + dy) - top;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('ink masks: no 2D context');
			}
			const replay = new PaintReplayer(
				context,
				Affine.translate(-left, -top).multiply(transform),
				{ scale, device: null },
			);
			for (const op of ops) {
				replay.replay(op);
			}
			replay.finish();
			const rgba = context.getImageData(0, 0, width, height).data;
			const runs: number[] = [];
			let start = -1;
			for (let i = 0; i <= width * height; i++) {
				const ink = i < width * height && (rgba[i * 4 + 3] ?? 0) >= 128;
				if (ink && start < 0) {
					start = i;
				} else if (!ink && start >= 0) {
					runs.push(start, i - start);
					start = -1;
				}
			}
			return { ...element, x: left, y: top, width, height, runs };
		});
	}
}
