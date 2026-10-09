import { Affine } from './affine';
import { Ink } from './ink';
import type { PaintOp, PathKind, PathSegment } from './paint-op';
import { PAINT_PROPS, type PaintProp, type PaintState } from './paint-state';

/* Where a replay's pixels go: device pixels per recorded CSS pixel, and, for a tile, the device
 * pixel its top-left corner sits at in the surface's virtual full-size bitmap. */
export interface ReplayTarget {
	readonly scale: number;
	readonly device: { readonly x: number; readonly y: number } | null;
}

/*
 * Paints recorded ops onto a real 2D context under a base transform (recorded space to this
 * context's pixels). It remembers what the context already holds, so a run of ops sharing one
 * state sets each style once.
 *
 * The context is saved on the first op and restored by finish(): a clip can only be lifted by a
 * restore, so each change of clips restores to that save point and re-cuts the new ones.
 */
export class PaintReplayer {
	private applied: PaintState | null = null;
	// What the context's props hold, or null when unknown (fresh, or just restored).
	private props: Map<PaintProp, unknown> | null = null;
	private clips: PaintState['clips'] | null = null;
	private dash: readonly number[] | null = null;
	private matrix: Affine | null = null;
	private started = false;

	constructor(
		private readonly ctx: CanvasRenderingContext2D,
		private readonly base: Affine,
		private readonly target: ReplayTarget,
		// The colors the recording's ink roles paint in.
		private readonly ink: Ink = Ink.DEFAULT,
	) {}

	replay(op: PaintOp): void {
		if (!this.started) {
			this.ctx.save();
			this.started = true;
		}
		const { call } = op;
		if (call.kind === 'putImageData') {
			this.put(call.data, call.args);
			return;
		}
		this.apply(op.state);
		if (op.path) {
			this.ctx.beginPath();
			this.trace(op.path);
		}
		this.transform(op.state.matrix);
		const ctx = this.ctx;
		switch (call.kind) {
			case 'fill':
				if (call.path2d) {
					ctx.fill(call.path2d, call.fillRule);
				} else {
					ctx.fill(call.fillRule);
				}
				break;
			case 'stroke':
				if (call.path2d) {
					ctx.stroke(call.path2d);
				} else {
					ctx.stroke();
				}
				break;
			case 'fillRect':
				ctx.fillRect(call.x, call.y, call.w, call.h);
				break;
			case 'strokeRect':
				ctx.strokeRect(call.x, call.y, call.w, call.h);
				break;
			case 'clearRect':
				ctx.clearRect(call.x, call.y, call.w, call.h);
				break;
			case 'fillText':
				if (call.outline) {
					call.outline.fill(ctx, call.x, call.y);
				} else {
					ctx.fillText(call.text, call.x, call.y, call.maxWidth);
				}
				break;
			case 'strokeText':
				ctx.strokeText(call.text, call.x, call.y, call.maxWidth);
				break;
			case 'drawImage':
				(
					ctx.drawImage as (image: CanvasImageSource, ...args: number[]) => void
				)(call.image, ...call.args);
				break;
		}
	}

	/* Leave the context as the replay found it. */
	finish(): void {
		if (this.started) {
			this.ctx.restore();
			this.started = false;
		}
		this.applied = null;
		this.props = null;
		this.clips = null;
		this.dash = null;
		this.matrix = null;
	}

	private apply(state: PaintState): void {
		if (state === this.applied) {
			return;
		}
		this.applied = state;
		const ctx = this.ctx as unknown as Record<PaintProp, unknown>;
		if (state.clips !== this.clips) {
			// Back to the save point, which forgets the props and dash set since.
			this.ctx.restore();
			this.ctx.save();
			this.props = null;
			this.dash = null;
			this.matrix = null;
			for (const clip of state.clips) {
				this.ctx.beginPath();
				if (Array.isArray(clip.path)) {
					this.trace(clip.path);
					this.transform(clip.matrix);
					this.ctx.clip(clip.fillRule);
				} else {
					this.transform(clip.matrix);
					this.ctx.clip(clip.path as Path2D, clip.fillRule);
				}
			}
			this.clips = state.clips;
		}
		const props = this.props ?? new Map<PaintProp, unknown>();
		for (const prop of PAINT_PROPS) {
			const value = state.props[prop];
			if (!props.has(prop) || props.get(prop) !== value) {
				ctx[prop] = this.ink.resolve(value);
				props.set(prop, value);
			}
		}
		this.props = props;
		if (state.lineDash !== this.dash) {
			this.ctx.setLineDash(state.lineDash as number[]);
			this.dash = state.lineDash;
		}
	}

	private trace(path: readonly PathSegment[]): void {
		const ctx = this.ctx as unknown as Record<
			PathKind,
			(...args: unknown[]) => void
		>;
		for (const segment of path) {
			this.transform(segment.matrix);
			ctx[segment.kind](...segment.args);
		}
	}

	private transform(matrix: Affine): void {
		if (matrix === this.matrix) {
			return;
		}
		this.matrix = matrix;
		const m = this.base.multiply(matrix);
		this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
	}

	// putImageData writes device pixels as they are, ignoring transform, clip and style. A tile
	// does that at its own offset; anything else (a loupe, a readback) gets the pixels drawn as an
	// image through the base transform, which blends where the original replaced.
	private put(data: ImageData, args: readonly number[]): void {
		const [dx = 0, dy = 0, x = 0, y = 0, w = data.width, h = data.height] =
			args;
		const { device, scale } = this.target;
		if (device) {
			this.ctx.putImageData(data, dx - device.x, dy - device.y, x, y, w, h);
			return;
		}
		const canvas = document.createElement('canvas');
		canvas.width = data.width;
		canvas.height = data.height;
		const scratch = canvas.getContext('2d');
		if (!scratch) {
			return;
		}
		scratch.putImageData(data, 0, 0, x, y, w, h);
		this.matrix = null;
		const m = this.base
			.multiply(Affine.scale(1 / scale))
			.multiply(Affine.translate(dx, dy));
		this.ctx.save();
		this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
		this.ctx.drawImage(canvas, 0, 0);
		this.ctx.restore();
	}
}
