import type { BoundingBox } from 'vexflow';

/*
 * An axis-aligned rectangle in canvas pixels. y grows downward (canvas convention), so
 * `top` is the smaller y and `bottom` the larger. Immutable — `translate` returns a new
 * Rect — because the collision pipeline resolves a position, *then* registers the placed
 * rect (see collision.ts); nothing ever mutates a rect already in the index, so sharing
 * is safe and there's no rebuild-on-move hazard.
 */
export class Rect {
	constructor(
		readonly x: number,
		readonly y: number,
		readonly w: number,
		readonly h: number,
	) {}

	get right(): number {
		return this.x + this.w;
	}

	get bottom(): number {
		return this.y + this.h;
	}

	/*
	 * True when the two rectangles overlap on a positive area. Strict (`<`, not `<=`): two
	 * rects that merely share an edge do NOT intersect. This matters because a 0px overlap
	 * would otherwise trigger a 0px "nudge" that still forces a re-layout and breaks the
	 * byte-exact screenshot tests — and edge-touching elements read as clear anyway.
	 */
	intersects(o: Rect): boolean {
		return (
			this.x < o.right &&
			o.x < this.right &&
			this.y < o.bottom &&
			o.y < this.bottom
		);
	}

	/* The overlapping region of the two rectangles, or null when they don't intersect. */
	intersection(o: Rect): Rect | null {
		if (!this.intersects(o)) {
			return null;
		}
		const x = Math.max(this.x, o.x);
		const y = Math.max(this.y, o.y);
		return new Rect(
			x,
			y,
			Math.min(this.right, o.right) - x,
			Math.min(this.bottom, o.bottom) - y,
		);
	}

	/*
	 * True when `o` lies entirely within this rectangle (inclusive edges). Used for the
	 * bounds/clip check — a content rect not contained by the page rect escapes into
	 * "no-man's land" and would be cut off.
	 */
	contains(o: Rect): boolean {
		return (
			o.x >= this.x &&
			o.y >= this.y &&
			o.right <= this.right &&
			o.bottom <= this.bottom
		);
	}

	/* A copy shifted by (dx, dy). */
	translate(dx: number, dy: number): Rect {
		return new Rect(this.x + dx, this.y + dy, this.w, this.h);
	}

	/*
	 * Build a Rect from a vexflow BoundingBox. Safe for staves and modifiers, but NOT for a
	 * raw note.getBoundingBox(): that unions in attached modifiers and a GraceNoteGroup's box
	 * reports a bogus near-origin y. Build note obstacles from noteTop()/getNoteHeadBounds
	 * instead (see draw.ts).
	 */
	static fromBoundingBox(bb: BoundingBox): Rect {
		return new Rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
	}
}
