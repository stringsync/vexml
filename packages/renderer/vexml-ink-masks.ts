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

	capture(separateNoteDots = false): InkMask[] {
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
			ops.map((op, i) => {
				const element = engraving.elements?.[i] ?? undefined;
				const kind =
					separateNoteDots && op.call.kind === 'fillText'
						? splitGlyphKind(element?.kind, op.call.text)
						: undefined;
				// VexFlow paints these modifiers inside the notehead group. Give each
				// glyph its own mask, even when two glyphs touch or coincide.
				return {
					...op,
					element:
						kind && element
							? {
									id: -i - 1,
									kind,
									parent: element.id,
									ancestors: [...(element.ancestors ?? []), element.id],
								}
							: element,
				};
			}),
			transform,
			scale,
		).capture();
	}
}

function noteDotKind(glyph: string): string | undefined {
	switch (glyph) {
		case '\uE1E7': // SMuFL augmentationDot
			return 'augmentation-dot';
		case '\uE4A0': // SMuFL articAccentAbove
		case '\uE4A1': // SMuFL articAccentBelow
			return 'accent';
		case '\uE4A2': // SMuFL articStaccatoAbove
		case '\uE4A3': // SMuFL articStaccatoBelow
			return 'staccato-dot';
		case '\uE4A4': // SMuFL articTenutoAbove
		case '\uE4A5': // SMuFL articTenutoBelow
			return 'tenuto';
		case '\uE4AC': // SMuFL articMarcatoAbove
		case '\uE4AD': // SMuFL articMarcatoBelow
			return 'strong-accent';
		case '\uE220': // SMuFL tremolo1
		case '\uE221': // SMuFL tremolo2
		case '\uE222': // SMuFL tremolo3
		case '\uE223': // SMuFL tremolo4
		case '\uE224': // SMuFL tremolo5
			return 'tremolo';
		case '\uE4C0': // SMuFL fermataAbove
		case '\uE4C1': // SMuFL fermataBelow
			return 'fermata';
		case '\uE4CE': // SMuFL breathMarkComma
		case '\uE4CF': // SMuFL breathMarkTick
			return 'breath-mark';
		case '\uE4D1': // SMuFL caesura
			return 'caesura';
		case '\uE614': // SMuFL stringsHarmonic
			return 'harmonic-circle';
		case '\uE633': // SMuFL pluckedLeftHandPizzicato (+)
			return 'stopped';
		case '\uE5E7': // SMuFL brassMuteOpen
			return 'brass-open';
		case '\uE5E6': // SMuFL brassMuteHalfClosed
			return 'half-muted';
		case '\uE5F4': // SMuFL windClosedHole
		case '\uE5F6': // SMuFL windHalfClosedHole1
		case '\uE5F9': // SMuFL windOpenHole
			return 'hole';
		case '\uE610': // SMuFL stringsDownBow
		case '\uE611': // SMuFL stringsDownBowTurned
			return 'down-bow';
		case '\uE612': // SMuFL stringsUpBow
		case '\uE613': // SMuFL stringsUpBowTurned
			return 'up-bow';
		case '\uE624': // SMuFL stringsThumbPosition
			return 'thumb-position';
		case '\uE630': // SMuFL pluckedSnapPizzicatoBelow
		case '\uE631': // SMuFL pluckedSnapPizzicatoAbove
			return 'snap-pizzicato';
		case '\uE636': // SMuFL pluckedWithFingernails
			return 'fingernails';
	}
}

function splitGlyphKind(
	elementKind: string | undefined,
	glyph: string,
): string | undefined {
	if (elementKind === 'notehead' || elementKind === 'stavenote') {
		return noteDotKind(glyph);
	}
	return glyph === '\uE4C0' || glyph === '\uE4C1' ? 'fermata' : undefined;
}
