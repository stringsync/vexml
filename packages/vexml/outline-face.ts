import { create, type Font, type Glyph, type GlyphRun } from 'fontkit';

/*
 * One font face read from its file, for what a canvas library can't say the way a browser does:
 * exact glyph bounds, and the outlines a snapshot carries so a page can draw its text before the
 * font arrives. Registered under the family the config names, whatever the file calls itself.
 */
export class OutlineFace {
	readonly weight: number;
	readonly italic: boolean;
	private readonly runs = new Map<string, GlyphRun>();

	private constructor(
		readonly family: string,
		private readonly font: Font,
	) {
		this.weight = font['OS/2']?.usWeightClass ?? 400;
		this.italic = font.italicAngle !== 0;
	}

	/* The face in `data`, or null when it holds none fontkit reads (or a collection). */
	static read(family: string, data: Uint8Array): OutlineFace | null {
		try {
			const font = create(
				Buffer.from(data.buffer, data.byteOffset, data.byteLength),
			);
			return 'layout' in font ? new OutlineFace(family, font) : null;
		} catch {
			return null;
		}
	}

	get unitsPerEm(): number {
		return this.font.unitsPerEm;
	}

	has(codePoint: number): boolean {
		return this.font.hasGlyphForCodePoint(codePoint);
	}

	/* `text` shaped as a browser shapes it by default: kerned, with the standard ligatures. */
	layout(text: string): GlyphRun {
		let run = this.runs.get(text);
		if (!run) {
			run = this.font.layout(text);
			this.runs.set(text, run);
		}
		return run;
	}

	glyph(id: number): Glyph {
		return this.font.getGlyph(id);
	}
}
