import type { Score } from '@stringsync/vexml';
import { Affine } from '../vexml/affine';
import { PaintDecoder } from '../vexml/paint-decoder';
import type { InkMask } from './ink-mask';
import { PaintInkMasks } from './paint-ink-masks';

/** Replays each attributed notation element onto its own transparent canvas, at the
 * same pixel grid as the capture. No layout boxes stand in for ink. */
export class VexmlInkMasks {
	constructor(
		private readonly score: Score,
		private readonly container: HTMLElement,
		private readonly pixelRatio: number = window.devicePixelRatio,
	) {}

	capture(): InkMask[] {
		const snapshot = this.score.snapshot();
		const engraving = snapshot.engraving;
		if (!engraving?.elements) {
			return [];
		}
		const base = this.container
			.querySelector('.vexml-canvas')
			?.getBoundingClientRect();
		if (!base) {
			throw new Error('ink masks: score surface missing');
		}
		const shot = this.container.getBoundingClientRect();
		const ratio = window.devicePixelRatio;
		const scale = (base.width / engraving.width) * ratio;
		const density = this.pixelRatio * engraving.scale;
		const dx =
			(base.x - shot.x) * ratio +
			(Math.round(engraving.origin[0] * density) / density) * scale;
		const dy =
			(base.y - shot.y) * ratio -
			(Math.round(-engraving.origin[1] * density) / density) * scale;
		const transform = new Affine(scale, 0, 0, scale, dx, dy);
		const ops = new PaintDecoder(snapshot.paint, snapshot.outlines).decode(
			engraving.ops,
		);
		return new PaintInkMasks(
			ops.map((op, i) => ({
				...op,
				element: engraving.elements?.[i] ?? undefined,
			})),
			transform,
			scale,
		).capture();
	}
}
