/**
 * A point in a 2D space. Positions are values: every operation returns a new
 * one, so passing one around cannot change it under the caller.
 */
export class Position {
	constructor(
		readonly x: number,
		readonly y: number,
	) {}

	static origin(): Position {
		return new Position(0, 0);
	}

	/** Where an event happened, in viewport coordinates. */
	static fromEvent(event: { clientX: number; clientY: number }): Position {
		return new Position(event.clientX, event.clientY);
	}

	isEqual(other: Position): boolean {
		return this.x === other.x && this.y === other.y;
	}

	/** The same point measured from another, e.g. an element's top left corner. */
	relativeTo(origin: { x: number; y: number }): Position {
		return new Position(this.x - origin.x, this.y - origin.y);
	}

	translate(dx: number, dy: number): Position {
		return new Position(this.x + dx, this.y + dy);
	}
}
