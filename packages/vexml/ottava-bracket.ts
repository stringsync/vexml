import { Metrics, TextBracket } from 'vexflow/core';

/*
 * An ottava bracket (<octave-shift>) whose label can be a SMuFL glyph: the one a document's
 * `<appearance><glyph type="octave-shift-...">` names. vexflow's TextBracket draws its label as
 * a numeral and a raised suffix in its text font, and keeps both elements to itself.
 */
export class OttavaBracket extends TextBracket {
	/* Label the bracket with `glyph` in the notation font, in place of the numeral and suffix. */
	useGlyph(glyph: string, notationFont: string): this {
		this.textElement.setFont(notationFont, Metrics.get('fontSize'));
		this.textElement.setText(glyph);
		this.superscriptElement.setText('');
		return this;
	}
}
