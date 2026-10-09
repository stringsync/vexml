import { CssFont } from './css-font';
import type { LoadedFont } from './headless-fonts';
import { OutlineFace } from './outline-face';
import { OutlineFonts } from './outline-fonts';
import { PaintDecoder } from './paint-decoder';
import type { PaintOp } from './paint-op';
import type { ScoreSnapshot, SnapshotOutlines } from './score-snapshot';

/*
 * Outlines every text a headless snapshot fills, from the font files it was engraved with, so a
 * page can paint the snapshot before its fonts arrive. Each glyph is stored once as SVG path data
 * in its font's units, and each (font, text) as where its glyphs sit from the pen, laid out as
 * a browser lays them out. A text that no face holds every character of is left out, and
 * painted with fillText.
 */
export class TextOutliner {
	private readonly fonts: OutlineFonts;
	private readonly glyphs: string[] = [];
	private readonly glyphIndex = new Map<string, number>();
	private readonly forms: number[] = [];
	private readonly formIndex = new Map<string, number>();

	constructor(loaded: readonly LoadedFont[]) {
		this.fonts = new OutlineFonts(
			loaded.flatMap((font) => OutlineFace.read(font.family, font.data) ?? []),
		);
	}

	outline(snapshot: ScoreSnapshot): ScoreSnapshot {
		const decoder = new PaintDecoder(snapshot.paint);
		const ops = [
			...(snapshot.engraving ? decoder.decode(snapshot.engraving.ops) : []),
			...(snapshot.fold?.strips.flatMap((strip) => decoder.decode(strip)) ??
				[]),
		];
		const strings = new Map(snapshot.paint.strings.map((s, i) => [s, i]));
		const fonts: string[] = [];
		const texts: number[][] = [];
		const seen = new Set<string>();
		for (const op of ops) {
			const text = textOf(op);
			const font = op.state.props.font;
			if (text === null || typeof font !== 'string') {
				continue;
			}
			const key = `${font}\n${text}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			const placed = this.place(font, text);
			if (!placed) {
				continue;
			}
			let fontAt = fonts.indexOf(font);
			if (fontAt < 0) {
				fontAt = fonts.push(font) - 1;
			}
			texts.push([fontAt, strings.get(text) ?? -1, ...placed]);
		}
		const outlines: SnapshotOutlines = {
			glyphs: this.glyphs,
			forms: this.forms,
			fonts,
			texts,
		};
		return { ...snapshot, outlines };
	}

	// Four numbers per glyph: its outline, its x and y from the pen in px, and its form.
	private place(font: string, text: string): number[] | null {
		const parsed = CssFont.parse(font);
		const laid = parsed && this.fonts.layout(parsed, text);
		if (!parsed || !laid) {
			return null;
		}
		const placed: number[] = [];
		for (const { face, run, pens, scale } of laid.runs) {
			// A browser slants a face that has no italic of its own.
			const skew = parsed.style !== 'normal' && !face.italic ? FAKE_ITALIC : 0;
			const form = this.form(scale, skew);
			run.glyphs.forEach((glyph, i) => {
				const position = run.positions[i];
				const outline = this.glyph(face, glyph.id);
				if (position && outline !== null) {
					placed.push(
						outline,
						(pens[i] ?? 0) + position.xOffset * scale,
						-position.yOffset * scale,
						form,
					);
				}
			});
		}
		return placed;
	}

	private glyph(face: OutlineFace, id: number): number | null {
		const key = `${face.family}\n${face.weight}\n${face.italic}\n${id}`;
		let index = this.glyphIndex.get(key);
		if (index === undefined) {
			const data = svg(face.glyph(id).path.commands);
			// A space has no ink, so nothing to fill.
			index = data === '' ? -1 : this.glyphs.push(data) - 1;
			this.glyphIndex.set(key, index);
		}
		return index < 0 ? null : index;
	}

	private form(scale: number, skew: number): number {
		const key = `${scale},${skew}`;
		let index = this.formIndex.get(key);
		if (index === undefined) {
			index = this.forms.length / 2;
			this.forms.push(scale, skew);
			this.formIndex.set(key, index);
		}
		return index;
	}
}

// Skia's slant for a synthesized italic.
const FAKE_ITALIC = 0.25;

const SVG_COMMANDS: Record<string, string> = {
	moveTo: 'M',
	lineTo: 'L',
	quadraticCurveTo: 'Q',
	bezierCurveTo: 'C',
	closePath: 'Z',
};

// SVG path data in font units, to a tenth of one: far below a pixel at any size a score uses.
function svg(commands: ReadonlyArray<{ command: string; args: number[] }>) {
	return commands
		.map(
			({ command, args }) =>
				(SVG_COMMANDS[command] ?? '') +
				args.map((n) => Math.round(n * 10) / 10).join(' '),
		)
		.join('');
}

function textOf(op: PaintOp): string | null {
	return op.call.kind === 'fillText' && op.call.maxWidth === undefined
		? op.call.text
		: null;
}
