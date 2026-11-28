import { Accidental } from 'vexflow/core';

/*
 * An altered unison's accidental, drawn in an explicit vexml group: the paint list gives ink
 * to the innermost explicit group, so without it these signs would not be read as accidentals.
 */
export class UnisonAccidental extends Accidental {
	override draw(): void {
		const ctx = this.checkContext();
		ctx.openGroup('vexml-accidental');
		super.draw();
		ctx.closeGroup();
	}
}
