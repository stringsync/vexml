import {
	Barline,
	type Stave,
	type StaveModifier,
	StaveModifierPosition,
} from 'vexflow/core';
import {
	barRects,
	closingBarRects,
	drawRepeat,
	fillBars,
	thinDoubleGap,
} from './barline-width';

/*
 * A Barline drawn at BarlineWidths' widths instead of vexflow's hardcoded ones. A stave's
 * begin and end barlines are the two it makes in its constructor, which setBegBarType and
 * setEndBarType retype in place, so a stave swaps those two for these (see
 * useDocumentBarlines) and keeps them whatever type it is given later.
 */
export class DocumentBarline extends Barline {
	/* The line spacing of the system's top stave, when this barline joins a connected system. */
	private connectedSpacing: number | null = null;

	/* Space this barline's strokes like `top`'s, so they line up with the connector across it. */
	connectTo(top: Stave): void {
		this.connectedSpacing = top.getSpacingBetweenLines();
	}

	override drawVerticalBar(stave: Stave, x: number, double?: boolean): void {
		const spacing = this.connectedSpacing ?? stave.getSpacingBetweenLines();
		const rects = double
			? barRects(['ordinary', 'ordinary'], thinDoubleGap(spacing))
			: barRects(['ordinary']);
		fillBars(stave, x, rects);
	}

	override drawVerticalEndBar(stave: Stave, x: number): void {
		if (this.getPosition() === StaveModifierPosition.END) {
			fillBars(stave, x, closingBarRects(stave.getSpacingBetweenLines()));
		} else {
			fillBars(stave, x, barRects(['light', 'heavy']));
		}
	}

	override drawRepeatBar(stave: Stave, x: number, begin: boolean): void {
		const spacing = this.connectedSpacing ?? stave.getSpacingBetweenLines();
		drawRepeat(stave, x, begin, spacing);
	}
}

/*
 * Swap the begin and end barlines a Stave constructor made (`modifiers[0]` and `[1]`) for
 * DocumentBarlines of the same type and position. Called by vexml's Stave subclasses with
 * their own modifiers, right after constructing.
 */
export function useDocumentBarlines(
	stave: Stave,
	modifiers: StaveModifier[],
): void {
	for (const slot of [0, 1]) {
		const barline = modifiers[slot];
		if (!(barline instanceof Barline) || barline instanceof DocumentBarline) {
			continue;
		}
		const replacement = new DocumentBarline(barline.getType());
		replacement.setPosition(barline.getPosition());
		replacement.setStave(stave);
		modifiers[slot] = replacement;
	}
}

/* Space `stave`'s barline at `position` like the system's `top` stave, which the connector spans. */
export function alignBarline(
	stave: Stave,
	top: Stave,
	position = StaveModifierPosition.END,
): void {
	const barline = stave
		.getModifiers(position)
		.find((modifier) => modifier instanceof DocumentBarline);
	barline?.connectTo(top);
}
