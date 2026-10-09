import type { GlyphRun } from 'fontkit';
import type { CssFont } from './css-font';
import type { OutlineFace } from './outline-face';

/* One run of text in one face, as laid out at a size: where the pen stands at each glyph, in px. */
export interface PlacedRun {
	readonly face: OutlineFace;
	readonly run: GlyphRun;
	readonly pens: readonly number[];
	readonly scale: number;
}

/*
 * The faces an engraving with no DOM has the files of, and text laid out in them the way a
 * browser lays it out: each character from the first family in the font's list whose face has
 * it, a face picked per family by CSS weight matching, advances snapped to HarfBuzz's 16.16
 * fixed point. A text with a character no listed family holds can't be laid out here: a browser
 * takes it from a system font, which this has no outlines of.
 */
export class OutlineFonts {
	constructor(private readonly faces: readonly OutlineFace[]) {}

	/* `text` in `font`, run by run, or null when a character is in none of its families. */
	layout(
		font: CssFont,
		text: string,
	): { runs: PlacedRun[]; width: number } | null {
		const runs: PlacedRun[] = [];
		let x = 0;
		let face: OutlineFace | null = null;
		let start = 0;
		const close = (end: number) => {
			if (face && end > start) {
				const scale = font.sizePx / face.unitsPerEm;
				const run = face.layout(text.slice(start, end));
				const pens: number[] = [];
				for (const position of run.positions) {
					pens.push(x);
					x += fixed(position.xAdvance * scale);
				}
				runs.push({ face, run, pens, scale });
			}
			start = end;
		};
		let at = 0;
		for (const char of text) {
			const next = this.faceFor(font, char.codePointAt(0) ?? 0);
			if (!next) {
				return null;
			}
			if (next !== face) {
				close(at);
				face = next;
			}
			at += char.length;
		}
		close(at);
		return { runs, width: x };
	}

	private faceFor(font: CssFont, codePoint: number): OutlineFace | null {
		for (const family of font.families) {
			const face = this.match(family, font.weight, font.style !== 'normal');
			if (face?.has(codePoint)) {
				return face;
			}
		}
		return null;
	}

	// CSS font matching within one family: the requested slant if any face has it, then the
	// nearest weight, searching toward 500 first from 400-500, down from lighter, up from bolder.
	private match(
		family: string,
		weight: number,
		italic: boolean,
	): OutlineFace | null {
		const named = this.faces.filter((face) => face.family === family);
		const slanted = named.filter((face) => face.italic === italic);
		const pool = slanted.length > 0 ? slanted : named;
		const exact = pool.find((face) => face.weight === weight);
		if (exact) {
			return exact;
		}
		const lighter = pool
			.filter((face) => face.weight < weight)
			.sort((a, b) => b.weight - a.weight);
		const heavier = pool
			.filter((face) => face.weight > weight)
			.sort((a, b) => a.weight - b.weight);
		if (weight >= 400 && weight <= 500) {
			const upTo500 = heavier.filter((face) => face.weight <= 500);
			const past500 = heavier.filter((face) => face.weight > 500);
			return upTo500[0] ?? lighter[0] ?? past500[0] ?? null;
		}
		return weight < 400
			? (lighter[0] ?? heavier[0] ?? null)
			: (heavier[0] ?? lighter[0] ?? null);
	}
}

// A length as HarfBuzz hands it to Blink: 16.16 fixed point, truncated.
function fixed(px: number): number {
	return Math.trunc(px * 65536) / 65536;
}
