import { ClefNote } from 'vexflow/core';

/** ClefNote renders text without VexFlow's clef group. Keep the mid-measure glyph
 * distinct from the ordinary text a diagnostic replay checks against the staff. */
export class AttributedClefNote extends ClefNote {
	override draw(): void {
		const context = this.checkContext();
		context.openGroup('vexml-clef');
		try {
			super.draw();
		} finally {
			context.closeGroup();
		}
	}
}
