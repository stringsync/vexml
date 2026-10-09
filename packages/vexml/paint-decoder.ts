import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import { GlyphOutline } from './glyph-outline';
import {
	anchorOf,
	CALL_FLAGS,
	type EncodedPaint,
	FILL_RULES,
	HAS_BOUNDS,
	NO_MAX_WIDTH,
	PAINT_CALLS,
	PATH_ARGS,
	PATH_KINDS,
	type PaintStream,
	SEGMENT_COUNT,
	SEGMENT_MATRIX,
} from './paint-encoder';
import type { PaintCall, PaintOp, PathSegment } from './paint-op';
import { type Clip, type PaintProps, PaintState } from './paint-state';
import type { SnapshotOutlines } from './score-snapshot';
import { type PlacedGlyph, TextOutline } from './text-outline';

/*
 * Turns PaintEncoder's streams back into ops. Every table entry becomes one object, so ops that
 * shared a state, transform or clip list when recorded share it again, and a replay sets each
 * once per run of them, as it does for a fresh recording. Given a snapshot's outlines, a text
 * they hold comes back with its TextOutline, which a replay fills in place of the text.
 */
export class PaintDecoder {
	private readonly matrices: Affine[] = [];
	private readonly states: PaintState[] = [];
	// Each state's matrix index, which its op's path segments start from.
	private readonly stateMatrices: number[] = [];
	// Each outlined text by font, then text.
	private readonly outlines = new Map<string, Map<string, TextOutline>>();

	constructor(
		private readonly tables: EncodedPaint,
		outlines: SnapshotOutlines | null = null,
	) {
		if (outlines) {
			this.readOutlines(outlines);
		}
		const { matrices, props, clips, dashes, states } = tables;
		for (let i = 0; i < matrices.length; i += 6) {
			this.matrices.push(
				new Affine(
					num(matrices[i]),
					num(matrices[i + 1]),
					num(matrices[i + 2]),
					num(matrices[i + 3]),
					num(matrices[i + 4]),
					num(matrices[i + 5]),
				),
			);
		}
		const propSets = props.map(
			(changed): PaintProps => ({ ...PaintState.INITIAL.props, ...changed }),
		);
		const clipLists = clips.map((list) =>
			list.map(([path, matrix, fillRule, rect]): Clip => {
				const segments: PathSegment[] = [];
				this.path(path, 1, num(path[0]), matrix, segments);
				return {
					path: segments,
					matrix: this.matrix(matrix),
					fillRule: FILL_RULES[fillRule] ?? 'nonzero',
					rect: rect
						? new Rect(num(rect[0]), num(rect[1]), num(rect[2]), num(rect[3]))
						: null,
				};
			}),
		);
		for (let i = 0; i < states.length; i += 4) {
			this.stateMatrices.push(num(states[i + 1]));
			this.states.push(
				PaintState.of(
					must(propSets[num(states[i])]),
					this.matrix(num(states[i + 1])),
					must(clipLists[num(states[i + 2])]),
					must(dashes[num(states[i + 3])]),
				),
			);
		}
	}

	decode(stream: PaintStream): PaintOp[] {
		const ops: PaintOp[] = [];
		let at = 0;
		const next = () => num(stream[at++]);
		while (at < stream.length) {
			const code = next();
			const stateIndex = next();
			const state = must(this.states[stateIndex]);
			const box = code & HAS_BOUNDS ? [next(), next(), next(), next()] : null;
			const length = next();
			let path: PathSegment[] | null = null;
			if (length >= 0) {
				path = [];
				at = this.path(
					stream,
					at,
					length,
					must(this.stateMatrices[stateIndex]),
					path,
				);
			}
			const kind = PAINT_CALLS[Math.floor(code / CALL_FLAGS)];
			let call: PaintCall;
			switch (kind) {
				case 'fill':
					call = { kind, fillRule: FILL_RULES[next()] };
					break;
				case 'stroke':
					call = { kind };
					break;
				case 'fillRect':
				case 'strokeRect':
				case 'clearRect':
					call = { kind, x: next(), y: next(), w: next(), h: next() };
					break;
				case 'fillText':
				case 'strokeText': {
					const text = must(this.tables.strings[next()]);
					const x = next();
					const y = next();
					if (!(code & NO_MAX_WIDTH)) {
						call = { kind, text, x, y, maxWidth: next() };
						break;
					}
					const outline =
						kind === 'fillText' ? this.outlineOf(state, text) : undefined;
					call = outline ? { kind, text, x, y, outline } : { kind, text, x, y };
					break;
				}
				default:
					throw new Error('vexml: unknown paint call in a snapshot');
			}
			let bounds: Rect | null = null;
			if (box) {
				const [ax, ay] = anchorOf(state.matrix, path, call);
				bounds = new Rect(
					ax + must(box[0]),
					ay + must(box[1]),
					must(box[2]),
					must(box[3]),
				);
			}
			ops.push({ state, path, call, bounds });
		}
		return ops;
	}

	/* Read `length` path segments from `stream` at `at` into `out`, the first under matrix `from`
	 * unless it names its own; returns where they end. */
	private path(
		stream: PaintStream,
		at: number,
		length: number,
		from: number,
		out: PathSegment[],
	): number {
		let matrix = this.matrix(from);
		for (let i = 0; i < length; i++) {
			const code = num(stream[at++]);
			const kind = PATH_KINDS[code % SEGMENT_MATRIX];
			if (!kind) {
				throw new Error('vexml: unknown path segment in a snapshot');
			}
			if (code & SEGMENT_MATRIX) {
				matrix = this.matrix(num(stream[at++]));
			}
			const count =
				code & SEGMENT_COUNT ? num(stream[at++]) : (PATH_ARGS[kind] ?? 0);
			out.push({ kind, matrix, args: stream.slice(at, at + count) });
			at += count;
		}
		return at;
	}

	private readOutlines({ glyphs, forms, fonts, texts }: SnapshotOutlines) {
		const paths = glyphs.map((data) => new GlyphOutline(data));
		for (const [font, text, ...placed] of texts) {
			const glyphsOf: PlacedGlyph[] = [];
			for (let i = 0; i + 3 < placed.length; i += 4) {
				const form = num(placed[i + 3]) * 2;
				glyphsOf.push({
					glyph: must(paths[num(placed[i])]),
					x: num(placed[i + 1]),
					y: num(placed[i + 2]),
					scale: num(forms[form]),
					skew: num(forms[form + 1]),
				});
			}
			const name = must(fonts[num(font)]);
			let byText = this.outlines.get(name);
			if (!byText) {
				byText = new Map();
				this.outlines.set(name, byText);
			}
			byText.set(
				must(this.tables.strings[num(text)]),
				new TextOutline(glyphsOf),
			);
		}
	}

	/* The outline of `text` in a canvas font, when the snapshot carries one. */
	outline(font: string, text: string): TextOutline | undefined {
		return this.outlines.get(font)?.get(text);
	}

	private outlineOf(state: PaintState, text: string): TextOutline | undefined {
		const font = state.props.font;
		return typeof font === 'string' ? this.outline(font, text) : undefined;
	}

	private matrix(index: number): Affine {
		return must(this.matrices[index]);
	}
}

function num(value: unknown): number {
	if (typeof value !== 'number') {
		throw new Error('vexml: a snapshot holds a malformed paint stream');
	}
	return value;
}

function must<T>(value: T | undefined): T {
	if (value === undefined) {
		throw new Error('vexml: a snapshot names a paint table entry it lacks');
	}
	return value;
}
