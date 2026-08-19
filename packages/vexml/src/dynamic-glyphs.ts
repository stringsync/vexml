/*
 * The letters a dynamic marking is spelled from, as music rather than text.
 *
 * SMuFL gives each dynamic LETTER its own glyph (dynamicPiano U+E520 … dynamicNiente
 * U+E526), and every standard marking is spelled out of those seven: "sfz" is s+f+z,
 * "mp" is m+p. Composing from the singles covers the whole MusicXML vocabulary without a
 * 24-entry table of ligature codepoints, and Bravura's sidebearings already space them.
 */
const GLYPHS: Record<string, string> = {
	p: '\uE520', // dynamicPiano
	m: '\uE521', // dynamicMezzo
	f: '\uE522', // dynamicForte
	r: '\uE523', // dynamicRinforzando
	s: '\uE524', // dynamicSforzando
	z: '\uE525', // dynamicZ
	n: '\uE526', // dynamicNiente
};

/*
 * Spells a dynamic marking (p, mf, sfz, …) in the notation font. A marking outside the
 * seven letters — an <other-dynamics>, or a tag with a stray character — has no spelling
 * and draws as plain italic text instead, so the reader flags each marking with `canSpell`
 * and the placer asks for the glyphs only when it says yes.
 */
export class DynamicGlyphs {
	/* The marking respelled in dynamic glyphs. An unmapped character passes through. */
	spell(text: string): string {
		return [...text].map((ch) => GLYPHS[ch] ?? ch).join('');
	}

	/* Whether every character of the marking has a dynamic glyph. */
	canSpell(text: string): boolean {
		return [...text].every((ch) => ch in GLYPHS);
	}
}
