import { Rect } from 'webappwiz/geometry';

/*
 * A 2D affine transform in the canvas's own (a, b, c, d, e, f) order: x' = ax + cy + e,
 * y' = bx + dy + f. Immutable, so a recorded paint op can hold the transform it was drawn under
 * and a replay can tell an unchanged one by reference. DOMMatrix would do, but bun has none and
 * the recording runs in unit tests.
 */
export class Affine {
	static readonly IDENTITY = new Affine(1, 0, 0, 1, 0, 0);

	constructor(
		readonly a: number,
		readonly b: number,
		readonly c: number,
		readonly d: number,
		readonly e: number,
		readonly f: number,
	) {}

	static scale(sx: number, sy: number = sx): Affine {
		return new Affine(sx, 0, 0, sy, 0, 0);
	}

	static translate(tx: number, ty: number): Affine {
		return new Affine(1, 0, 0, 1, tx, ty);
	}

	/* `this` after `other`: the matrix a canvas holds once `other` is applied on top of `this`. */
	multiply(other: Affine): Affine {
		return new Affine(
			this.a * other.a + this.c * other.b,
			this.b * other.a + this.d * other.b,
			this.a * other.c + this.c * other.d,
			this.b * other.c + this.d * other.d,
			this.a * other.e + this.c * other.f + this.e,
			this.b * other.e + this.d * other.f + this.f,
		);
	}

	isEqual(other: Affine): boolean {
		return (
			this.a === other.a &&
			this.b === other.b &&
			this.c === other.c &&
			this.d === other.d &&
			this.e === other.e &&
			this.f === other.f
		);
	}

	// A rect under an unrotated, unskewed transform stays a rect, so a clear or a clip through
	// one covers exactly its mapped box.
	get isAxisAligned(): boolean {
		return this.b === 0 && this.c === 0;
	}

	/* How far a unit length can stretch: the bound on how wide a stroke lands. */
	get maxScale(): number {
		return Math.max(Math.hypot(this.a, this.b), Math.hypot(this.c, this.d));
	}

	/* The box holding the four mapped corners of the local box (x0, y0)-(x1, y1). */
	mapBox(x0: number, y0: number, x1: number, y1: number): Rect {
		// Each axis's extremes come from the sign of its two coefficients, so the four corners
		// never need mapping one by one; this runs once per recorded op. A negative-size rect
		// (fillRect(10, 10, -5, -5) is legal) is flipped first.
		if (x0 > x1) {
			[x0, x1] = [x1, x0];
		}
		if (y0 > y1) {
			[y0, y1] = [y1, y0];
		}
		const [ax0, ax1] =
			this.a < 0 ? [this.a * x1, this.a * x0] : [this.a * x0, this.a * x1];
		const [cy0, cy1] =
			this.c < 0 ? [this.c * y1, this.c * y0] : [this.c * y0, this.c * y1];
		const [bx0, bx1] =
			this.b < 0 ? [this.b * x1, this.b * x0] : [this.b * x0, this.b * x1];
		const [dy0, dy1] =
			this.d < 0 ? [this.d * y1, this.d * y0] : [this.d * y0, this.d * y1];
		return new Rect(
			ax0 + cy0 + this.e,
			bx0 + dy0 + this.f,
			ax1 + cy1 - ax0 - cy0,
			bx1 + dy1 - bx0 - dy0,
		);
	}
}
