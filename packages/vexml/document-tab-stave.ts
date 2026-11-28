import { TabStave } from 'vexflow/core';
import { useDocumentBarlines } from './document-barline';

/* A TabStave whose barlines draw at the document's widths (see DocumentBarline). */
export class DocumentTabStave extends TabStave {
	constructor(
		x: number,
		y: number,
		width: number,
		options: ConstructorParameters<typeof TabStave>[3],
	) {
		super(x, y, width, options);
		useDocumentBarlines(this, this.modifiers);
	}
}
