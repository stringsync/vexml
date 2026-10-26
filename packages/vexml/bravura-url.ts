/** The URL of vexml's own Bravura woff2, the whole face. With no notation url the font
 * loader injects it behind BRAVURA_COMMON_URL, on BRAVURA_REST_RANGE. Callers who want to
 * preload or cache it import the same file as `@stringsync/vexml/fonts/bravura.woff2`
 * instead. */
// A literal `new URL(..., import.meta.url)` because that exact spelling is what bundlers
// (Vite, Rollup, webpack 5) look for to emit the file as a hashed asset; any other hides it
// from them. The bytes are the woff2 VexFlow 5.0.0 embeds as base64, decoded.
export const BRAVURA_URL = new URL(
	'./assets/fonts/Bravura.woff2',
	import.meta.url,
).href;

/** The URL of the common Bravura subset, BRAVURA_COMMON_RANGE cut from BRAVURA_URL, which
 * the font loader injects first with no notation url, so most scores fetch only this file.
 * Exported as `@stringsync/vexml/fonts/bravura-common.woff2`. */
export const BRAVURA_COMMON_URL = new URL(
	'./assets/fonts/BravuraCommon.woff2',
	import.meta.url,
).href;

/** The SMuFL glyphs most scores draw, as a CSS unicode-range: brackets, repeats, clefs,
 * time signature digits, noteheads, the augmentation dot, flags, accidentals,
 * articulations, fermatas, rests, octave lines, dynamics, chord symbols, tuplet digits and
 * metronome notes, plus Latin-1 so typed text never reaches the rest of the face.
 * `assets/fonts/BravuraCommon.woff2` is this range cut from `Bravura.woff2` with fontTools:
 * `pyftsubset Bravura.woff2 --unicodes="<range>" --flavor=woff2 --notdef-outline
 * --output-file=BravuraCommon.woff2`. Change both together. */
export const BRAVURA_COMMON_RANGE =
	'U+0000-00FF, U+E000-E00F, U+E040-E06F, U+E080-E08F, U+E0A0-E0DF, U+E1E7, U+E240-E26F, U+E4A0-E4FF, U+E510-E54F, U+E870-E88F, U+ECA0-ECBF';

/** Every codepoint BRAVURA_COMMON_RANGE leaves out, the range of the whole face behind the
 * common one: a face also covering the common glyphs would be fetched for them, since the
 * browser takes a glyph from the face defined last. */
export const BRAVURA_REST_RANGE =
	'U+0100-DFFF, U+E010-E03F, U+E070-E07F, U+E090-E09F, U+E0E0-E1E6, U+E1E8-E23F, U+E270-E49F, U+E500-E50F, U+E550-E86F, U+E890-EC9F, U+ECC0-10FFFF';
