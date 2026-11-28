import { BarNote } from 'vexflow/core';
import { DocumentBarline } from './document-barline';

/*
 * A BarNote (a mid-measure `<barline>`) drawn as a DocumentBarline: vexflow's BarNote builds a
 * stock Barline on every draw, which would ignore the document's barline widths.
 */
export class DocumentBarNote extends BarNote {
	override draw(): void {
		const barline = new DocumentBarline(this.getType());
		barline.setX(this.getAbsoluteX());
		barline.setStave(this.checkStave());
		barline.setContext(this.checkContext());
		barline.drawWithStyle();
		this.setRendered();
	}
}
