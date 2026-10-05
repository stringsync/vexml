export interface Point {
	x: number;
	y: number;
}

export function distance(a: Point, b: Point): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lerp(from: Point, to: Point, t: number): Point {
	return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
