/** The URL of vexml's own Bravura woff2, the face the font loader injects when a render
 * names no notation url. Callers who want to preload or cache it import the same file as
 * `@stringsync/vexml/fonts/bravura.woff2` instead. */
// A literal `new URL(..., import.meta.url)` because that exact spelling is what bundlers
// (Vite, Rollup, webpack 5) look for to emit the file as a hashed asset; any other hides it
// from them. The bytes are the woff2 VexFlow 5.0.0 embeds as base64, decoded.
export const BRAVURA_URL = new URL(
	'./assets/fonts/Bravura.woff2',
	import.meta.url,
).href;
