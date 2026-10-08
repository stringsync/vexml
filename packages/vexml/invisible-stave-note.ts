import { Annotation, StaveNote } from 'vexflow/core';

/*
 * A note (or rest) marked print-object="no": it holds its tick so the other voices stay
 * aligned, but draws nothing. Exporters lean on this to hide the spacer notes that keep a
 * voice open, so drawing them puts noteheads on the page that shouldn't be there.
 *
 * It stays a real StaveNote: it formats, reserves width, and pins its lyrics like any
 * other note, so only draw() changes. Lyrics still print: <lyric> carries its own
 * print-object, and the label an exporter hangs off a hidden note is the one thing about
 * it that IS meant to be seen (OSMD keeps them too). Annotation-only drawing mirrors
 * vexflow's own GhostNote.
 */
export class InvisibleStaveNote extends StaveNote {
	constructor(...args: ConstructorParameters<typeof StaveNote>) {
		super(...args);
		// vexflow's own "this note isn't on the page" flag. Setting it matters beyond its
		// early return in StaveNote.draw (which this class overrides anyway): StaveNote.format
		// reads it when it pairs the voices sharing a tick, and two voices holding the same
		// rest there make it suppress ONE of them. Without the flag the survivor can be the
		// hidden note, blanking a rest that should print.
		this.renderOptions.draw = false;
	}

	override draw(): void {
		this.setRendered();
		const ctx = this.checkContext();
		for (const modifier of this.getModifiers()) {
			if (modifier instanceof Annotation) {
				modifier.setContext(ctx).drawWithStyle();
			}
		}
	}
}
