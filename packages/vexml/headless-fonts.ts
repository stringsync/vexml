import { VexFlow } from 'vexflow/core';
import { DEFAULT_FONT_CONFIG, type FontConfig } from './config';
import { FontFamilies } from './font-families';

/** A font createSnapshot measures and outlines text with: its bytes, or the path or file URL
 * to read them from. `family` is the name the config's fonts use for it. */
export interface HeadlessFont {
	family: string;
	source: string | URL | Uint8Array | ArrayBuffer;
}

/** A canvas library's font registry, where createSnapshot registers each font under its
 * family so the canvas measures text in it. @napi-rs/canvas's `GlobalFonts` is one as it
 * is; wrap another library's in an object with this method. */
export interface FontRegistry {
	register(data: Uint8Array, family: string): unknown;
}

/* One font's bytes, read, under the family it was registered as. */
export interface LoadedFont {
	readonly family: string;
	readonly data: Uint8Array;
}

/*
 * The fonts of an engraving with no DOM: read from bytes or files, registered with the canvas
 * library that measures them, and named as vexflow's global glyph fonts, as DefaultFontLoader
 * does in a browser. vexml's own Bravura comes along unless the config names another notation
 * font or a url for it.
 */
export class HeadlessFonts {
	private readonly loaded: LoadedFont[] = [];

	constructor(
		private readonly registry: FontRegistry | null,
		private readonly fonts: readonly HeadlessFont[],
	) {}

	/* Every font read, for the glyph outlines a snapshot carries. */
	get all(): readonly LoadedFont[] {
		return this.loaded;
	}

	async load(config: FontConfig): Promise<FontFamilies> {
		const families = new FontFamilies(config);
		const sources = [...this.fonts];
		const bravura =
			families.notation === DEFAULT_FONT_CONFIG.notation.family &&
			!config.notation?.url &&
			!sources.some((font) => font.family === families.notation);
		if (bravura) {
			sources.push({
				family: families.notation,
				source: new URL('./assets/fonts/Bravura.woff2', import.meta.url),
			});
		}
		for (const font of sources) {
			const data = await this.read(font.source);
			this.registry?.register(toBuffer(data), font.family);
			this.loaded.push({ family: font.family, data });
		}
		// The same font stack DefaultFontLoader sets: music glyphs from the notation font, and
		// what vexflow types from the next family that has the letter.
		VexFlow.setFonts(
			`'${families.notation}'`,
			`'${families.text}'`,
			'sans-serif',
		);
		return families;
	}

	private async read(source: HeadlessFont['source']): Promise<Uint8Array> {
		if (source instanceof Uint8Array) {
			return source;
		}
		if (source instanceof ArrayBuffer) {
			return new Uint8Array(source);
		}
		// Server-side only, so the browser build never meets node:fs.
		const { readFile } = await import('node:fs/promises');
		return new Uint8Array(await readFile(source));
	}
}

// A canvas library binding (napi) may want a Node Buffer rather than any Uint8Array.
function toBuffer(data: Uint8Array): Uint8Array {
	return typeof Buffer === 'undefined'
		? data
		: Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
