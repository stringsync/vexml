import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import {
	type EncodedPaint,
	FILL_RULES,
	PAINT_CALLS,
	PATH_ARGS,
	PATH_KINDS,
	type PaintStream,
	SEGMENT_COUNT,
	SEGMENT_MATRIX,
} from './paint-encoder';
import type { PaintCall, PaintOp, PathSegment } from './paint-op';
import { type Clip, type PaintProps, PaintState } from './paint-state';

/*
 * Turns PaintEncoder's streams back into ops. Every table entry becomes one object, so ops that
 * shared a state, transform or clip list when recorded share it again, and a replay sets each
 * once per run of them, as it does for a fresh recording.
 */
export class PaintDecoder {
	private readonly matrices: Affine[] = [];
	private readonly states: PaintState[] = [];
	// Each state's matrix index, which its op's path segments start from.
	private readonly stateMatrices: number[] = [];

	constructor(private readonly tables: EncodedPaint) {
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
			const bounds = code & 1 ? new Rect(next(), next(), next(), next()) : null;
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
			const kind = PAINT_CALLS[code >> 1];
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
					const maxWidth = stream[at++];
					call =
						typeof maxWidth === 'number'
							? { kind, text, x, y, maxWidth }
							: { kind, text, x, y };
					break;
				}
				default:
					throw new Error('vexml: unknown paint call in a snapshot');
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
