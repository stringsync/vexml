import type { Position } from "./position";

/**
 * An axis-aligned rectangle, positioned at its top left corner. y grows
 * downward, the convention every browser API uses, so `top` is the smaller y
 * and `bottom` the larger.
 *
 * Rectangles are values: every operation returns a new one, so a rect handed to
 * a collision index or a layout cache cannot move under it.
 */
export class Rect {
	constructor(
		readonly x: number,
		readonly y: number,
		readonly w: number,
		readonly h: number,
	) {}

	static zero(): Rect {
		return new Rect(0, 0, 0, 0);
	}

	/** A rect from anything shaped like a `DOMRect`, such as `getBoundingClientRect()`. */
	static fromDomRect(rect: {
		x: number;
		y: number;
		width: number;
		height: number;
	}): Rect {
		return new Rect(rect.x, rect.y, rect.width, rect.height);
	}

	get top(): number {
		return this.y;
	}

	get left(): number {
		return this.x;
	}

	get right(): number {
		return this.x + this.w;
	}

	get bottom(): number {
		return this.y + this.h;
	}

	get area(): number {
		return this.w * this.h;
	}

	isEqual(other: Rect): boolean {
		return (
			this.x === other.x &&
			this.y === other.y &&
			this.w === other.w &&
			this.h === other.h
		);
	}

	/** Whether the point lies within this rect, edges included. */
	contains(position: Position): boolean {
		return (
			position.x >= this.x &&
			position.x <= this.right &&
			position.y >= this.y &&
			position.y <= this.bottom
		);
	}

	/** Whether `other` lies entirely within this rect, edges included. */
	containsRect(other: Rect): boolean {
		return (
			other.x >= this.x &&
			other.y >= this.y &&
			other.right <= this.right &&
			other.bottom <= this.bottom
		);
	}

	/**
	 * Whether the two rects overlap on a positive area. Two rects that merely
	 * share an edge do not intersect: an overlap of zero is not an overlap, and
	 * counting it as one means nudging things apart by 0px forever.
	 */
	intersects(other: Rect): boolean {
		return (
			this.x < other.right &&
			other.x < this.right &&
			this.y < other.bottom &&
			other.y < this.bottom
		);
	}

	/** The overlapping region of the two rects, or null when they do not intersect. */
	intersection(other: Rect): Rect | null {
		if (!this.intersects(other)) {
			return null;
		}
		const left = Math.max(this.x, other.x);
		const top = Math.max(this.y, other.y);
		return new Rect(
			left,
			top,
			Math.min(this.right, other.right) - left,
			Math.min(this.bottom, other.bottom) - top,
		);
	}

	/** The smallest rect holding both. */
	union(other: Rect): Rect {
		const left = Math.min(this.x, other.x);
		const top = Math.min(this.y, other.y);
		return new Rect(
			left,
			top,
			Math.max(this.right, other.right) - left,
			Math.max(this.bottom, other.bottom) - top,
		);
	}

	/** A copy shifted by (dx, dy). */
	translate(dx: number, dy: number): Rect {
		return new Rect(this.x + dx, this.y + dy, this.w, this.h);
	}

	/** A copy of the same size, moved to the origin. */
	atOrigin(): Rect {
		return new Rect(0, 0, this.w, this.h);
	}
}
