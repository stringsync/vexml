/*
 * The letters a dynamic marking is spelled from, as music rather than text.
 *
 * SMuFL gives each dynamic LETTER its own glyph, in order from U+E520: dynamicPiano,
 * dynamicMezzo, dynamicForte, dynamicRinforzando, dynamicSforzando, dynamicZ, dynamicNiente.
 * Every standard marking is spelled out of those seven: "sfz" is s+f+z, "mp" is m+p.
 * Composing from the singles covers the whole MusicXML vocabulary without a 24-entry table
 * of ligature codepoints, and Bravura's sidebearings already space them.
 */
const GLYPHS: Record<string, string> = {
	p: '\uE520',
	m: '\uE521',
	f: '\uE522',
	r: '\uE523',
	s: '\uE524',
	z: '\uE525',
	n: '\uE526',
};

/*
 * Spells a dynamic marking (p, mf, sfz, …) in the notation font. A marking outside the
 * seven letters (an <other-dynamics>, or a tag with a stray character) has no spelling
 * and draws as plain italic text instead, so the reader flags each marking with `canSpell`
 * and the placer asks for the glyphs only when it says yes.
 */
export class DynamicGlyphs {
	/* The marking respelled in dynamic glyphs. An unmapped character passes through. */
	spell(text: string): string {
		return [...text].map((ch) => GLYPHS[ch] ?? ch).join('');
	}

	/* Ask before spell(): a marking that can't be spelled whole draws as plain italic text instead. */
	canSpell(text: string): boolean {
		return [...text].every((ch) => ch in GLYPHS);
	}
}
