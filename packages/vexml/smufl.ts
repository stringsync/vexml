import { VexFlow } from 'vexflow/core';

/*
 * The character a SMuFL glyph name draws, the value of a MusicXML smufl attribute
 * (smufl="ornamentPrecompSlide"). Undefined when the name is absent or the notation font
 * has no glyph by it, so the caller can fall back to the element's text.
 */
export function smuflGlyph(
	name: string | null | undefined,
): string | undefined {
	if (!name) {
		return undefined;
	}
	return (VexFlow.Glyphs as Record<string, string>)[name];
}
