import type { Affine } from './affine';
import type { PaintCall, PaintOp, PathKind, PathSegment } from './paint-op';
import {
	type Clip,
	PAINT_PROPS,
	type PaintProps,
	PaintState,
} from './paint-state';

/*
 * Encodes op lists against tables shared between them, so the engraving and the fold's strips
 * store a state they share once. Coordinates stay exact: rounding them, even to a thousandth of
 * a px, moves glyphs across the rasterizer's subpixel steps. Bounds are rounded out to whole px,
 * which only files an op under a tile it leaves blank. A path segment stores its transform only
 * where it differs from the one before (the op's own, for the first), and its argument count
 * only where the call's varies. Throws on what a snapshot cannot carry: images, Path2D,
 * gradients and patterns, which vexml's own engraving never draws.
 *
 * The op stream, per op: call * 2 + (1 when it has bounds), state, [x, y, w, h], the path's
 * segment count or -1, each segment, then the call's own arguments.
 */
export class PaintEncoder {
	private readonly strings: string[] = [];
	private readonly stringIndex = new Map<string, number>();
	private readonly matrices: number[] = [];
	private readonly matrixIndex = new Map<Affine, number>();
	private readonly matrixByValue = new Map<string, number>();
	private readonly props: EncodedPaint['props'] = [];
	private readonly propsIndex = new Map<PaintProps, number>();
	private readonly propsByValue = new Map<string, number>();
	private readonly clips: EncodedPaint['clips'] = [];
	private readonly clipsIndex = new Map<readonly Clip[], number>();
	private readonly dashes: number[][] = [];
	private readonly dashIndex = new Map<readonly number[], number>();
	private readonly dashByValue = new Map<string, number>();
	private readonly states: number[] = [];
	private readonly stateIndex = new Map<PaintState, number>();

	encode(ops: readonly PaintOp[]): PaintStream {
		const out: PaintStream = [];
		for (const op of ops) {
			const call = PAINT_CALLS.indexOf(op.call.kind as never);
			if (call < 0) {
				throw new Error(`vexml: a snapshot cannot hold a ${op.call.kind}`);
			}
			out.push(call * 2 + (op.bounds ? 1 : 0), this.state(op.state));
			if (op.bounds) {
				const { x, y, right, bottom } = op.bounds;
				const x0 = Math.floor(x);
				const y0 = Math.floor(y);
				out.push(x0, y0, Math.ceil(right) - x0, Math.ceil(bottom) - y0);
			}
			if (op.path) {
				out.push(op.path.length);
				this.path(op.path, this.matrix(op.state.matrix), out);
			} else {
				out.push(-1);
			}
			this.call(op.call, out);
		}
		return out;
	}

	tables(): EncodedPaint {
		return {
			strings: this.strings,
			matrices: this.matrices,
			props: this.props,
			clips: this.clips,
			dashes: this.dashes,
			states: this.states,
		};
	}

	private call(call: PaintCall, out: PaintStream): void {
		switch (call.kind) {
			case 'fill':
				if (call.path2d) {
					throw new Error('vexml: a snapshot cannot hold a Path2D');
				}
				out.push(FILL_RULES.indexOf(call.fillRule));
				return;
			case 'stroke':
				if (call.path2d) {
					throw new Error('vexml: a snapshot cannot hold a Path2D');
				}
				return;
			case 'fillRect':
			case 'strokeRect':
			case 'clearRect':
				out.push(exact(call.x), exact(call.y), exact(call.w), exact(call.h));
				return;
			case 'fillText':
			case 'strokeText':
				out.push(
					this.string(call.text),
					exact(call.x),
					exact(call.y),
					call.maxWidth === undefined ? null : exact(call.maxWidth),
				);
				return;
		}
	}

	private path(
		path: readonly PathSegment[],
		from: number,
		out: PaintStream,
	): void {
		let previous = from;
		for (const segment of path) {
			const matrix = this.matrix(segment.matrix);
			const fixed = PATH_ARGS[segment.kind] === segment.args.length;
			out.push(
				PATH_KINDS.indexOf(segment.kind) +
					(matrix === previous ? 0 : SEGMENT_MATRIX) +
					(fixed ? 0 : SEGMENT_COUNT),
			);
			if (matrix !== previous) {
				out.push(matrix);
				previous = matrix;
			}
			if (!fixed) {
				out.push(segment.args.length);
			}
			for (const arg of segment.args) {
				out.push(this.arg(arg));
			}
		}
	}

	private arg(arg: unknown): PaintStream[number] {
		if (typeof arg === 'number') {
			return exact(arg);
		}
		if (typeof arg === 'boolean' || arg === null) {
			return arg;
		}
		if (arg === undefined) {
			return null;
		}
		// roundRect's radii.
		if (Array.isArray(arg) && arg.every((r) => typeof r === 'number')) {
			return arg.map(exact);
		}
		throw new Error('vexml: a snapshot cannot hold this path argument');
	}

	private state(state: PaintState): number {
		const known = this.stateIndex.get(state);
		if (known !== undefined) {
			return known;
		}
		const index = this.states.length / 4;
		this.states.push(
			this.propsOf(state.props),
			this.matrix(state.matrix),
			this.clipsOf(state.clips),
			this.dash(state.lineDash),
		);
		this.stateIndex.set(state, index);
		return index;
	}

	private propsOf(props: PaintProps): number {
		const known = this.propsIndex.get(props);
		if (known !== undefined) {
			return known;
		}
		const changed: Record<string, string | number | boolean> = {};
		for (const prop of PAINT_PROPS) {
			const value = props[prop];
			if (value === PaintState.INITIAL.props[prop]) {
				continue;
			}
			if (
				typeof value !== 'string' &&
				typeof value !== 'number' &&
				typeof value !== 'boolean'
			) {
				throw new Error(`vexml: a snapshot cannot hold this ${prop}`);
			}
			changed[prop] = value;
		}
		const key = JSON.stringify(changed);
		let index = this.propsByValue.get(key);
		if (index === undefined) {
			index = this.props.length;
			this.props.push(changed);
			this.propsByValue.set(key, index);
		}
		this.propsIndex.set(props, index);
		return index;
	}

	private matrix(matrix: Affine): number {
		const known = this.matrixIndex.get(matrix);
		if (known !== undefined) {
			return known;
		}
		const { a, b, c, d, e, f } = matrix;
		const key = `${a},${b},${c},${d},${e},${f}`;
		let index = this.matrixByValue.get(key);
		if (index === undefined) {
			index = this.matrices.length / 6;
			this.matrices.push(a, b, c, d, e, f);
			this.matrixByValue.set(key, index);
		}
		this.matrixIndex.set(matrix, index);
		return index;
	}

	private clipsOf(clips: readonly Clip[]): number {
		const known = this.clipsIndex.get(clips);
		if (known !== undefined) {
			return known;
		}
		const encoded = clips.map((clip): EncodedPaint['clips'][number][number] => {
			if (!Array.isArray(clip.path)) {
				throw new Error('vexml: a snapshot cannot hold a Path2D clip');
			}
			const matrix = this.matrix(clip.matrix);
			const path: PaintStream = [clip.path.length];
			this.path(clip.path, matrix, path);
			const { rect } = clip;
			return [
				path,
				matrix,
				FILL_RULES.indexOf(clip.fillRule),
				rect ? [rect.x, rect.y, rect.w, rect.h] : null,
			];
		});
		const index = this.clips.length;
		this.clips.push(encoded);
		this.clipsIndex.set(clips, index);
		return index;
	}

	private dash(dash: readonly number[]): number {
		const known = this.dashIndex.get(dash);
		if (known !== undefined) {
			return known;
		}
		const key = dash.join(',');
		let index = this.dashByValue.get(key);
		if (index === undefined) {
			index = this.dashes.length;
			this.dashes.push([...dash]);
			this.dashByValue.set(key, index);
		}
		this.dashIndex.set(dash, index);
		return index;
	}

	private string(text: string): number {
		let index = this.stringIndex.get(text);
		if (index === undefined) {
			index = this.strings.length;
			this.strings.push(text);
			this.stringIndex.set(text, index);
		}
		return index;
	}
}

/*
 * Recorded paint ops as JSON-safe data. A naive dump repeats every op's state; here each distinct
 * state, transform, clip list, dash, prop set and text is stored once in a table and an op names
 * it by index, and every op is a run of numbers in one flat stream.
 */
export interface EncodedPaint {
	strings: string[];
	/* Six numbers per transform, in the canvas's (a, b, c, d, e, f) order. */
	matrices: number[];
	/* Only the props that differ from a fresh context's: an op leaves most at their defaults. */
	props: Array<Record<string, string | number | boolean>>;
	/* Each a clip stack: [path stream, matrix, fill rule, rect or null] per clip; the path's
	 * segments start from the clip's matrix. */
	clips: Array<Array<[PaintStream, number, number, number[] | null]>>;
	dashes: number[][];
	/* Four indexes per state: props, matrix, clips, dash. */
	states: number[];
}

/* One op list in the stream form PaintEncoder writes and PaintDecoder reads. */
export type PaintStream = Array<number | string | boolean | null | number[]>;

/* Positions in the stream's lookup lists are the format: append, never reorder. */
export const PAINT_CALLS = [
	'fill',
	'stroke',
	'fillRect',
	'strokeRect',
	'clearRect',
	'fillText',
	'strokeText',
] as const;
export const PATH_KINDS: readonly PathKind[] = [
	'moveTo',
	'lineTo',
	'quadraticCurveTo',
	'bezierCurveTo',
	'arc',
	'arcTo',
	'ellipse',
	'rect',
	'roundRect',
	'closePath',
];
export const FILL_RULES = [undefined, 'nonzero', 'evenodd'] as const;

/* How many arguments each path call takes, where that is always the same; the rest store it. */
export const PATH_ARGS: Partial<Record<PathKind, number>> = {
	moveTo: 2,
	lineTo: 2,
	quadraticCurveTo: 4,
	bezierCurveTo: 6,
	arcTo: 5,
	rect: 4,
	closePath: 0,
};
// A path segment's code: its kind, plus these flags.
export const SEGMENT_MATRIX = 16;
export const SEGMENT_COUNT = 32;

/* A number as JSON can hold it: NaN and the infinities would come back as null. */
function exact(value: number): number {
	if (!Number.isFinite(value)) {
		throw new Error('vexml: a snapshot cannot hold a non-finite coordinate');
	}
	return value;
}
