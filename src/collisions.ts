import { FAR } from './constants';
import { Rect } from './geometry';
import { QuadTree } from './quadtree';

/*
 * Generic collision detection + nudge resolution for the renderer.
 *
 * The renderer draws in immediate mode, so the ONLY way to resolve a clash is to position a
 * movable element before it's drawn. The flow per element is: compute its natural Rect, ask
 * the detector to resolve it against everything already placed, draw at the resolved
 * position, then register the placed Rect so later elements avoid it in turn.
 *
 * Not everything is movable. Register fixed things (noteheads, stems, ties) as obstacles;
 * only nudge the things that can yield (chord symbols, words, chord diagrams). The detector
 * reports the TYPE of each collision — the other element's `kind` plus the axis/direction of
 * the minimum separation (`mtv`) — so a caller can pick the right fix. The constrained
 * resolvers below (`liftClear`, `pushRightOf`) encode the per-kind policy directly: text
 * only ever lifts up, diagrams only push right, so a raw minimum-translation can't shove a
 * chord symbol sideways off the note it labels.
 *
 * ANY new "move this so it clears that" logic should go through here — do not add new bespoke
 * magic-offset clearance code. See docs/collision-audit.md.
 */

export type CollisionKind = 'note' | 'tie' | 'annotation' | 'diagram';
export type Collidable = { rect: Rect; kind: CollisionKind };
export type Axis = 'x' | 'y';
export type Edge = 'top' | 'bottom' | 'left' | 'right';

/* One detected collision. `other.kind` + `mtv.axis` are "the type of collision". */
export type Collision = {
	other: Collidable;
	overlap: Rect;
	/* Signed minimum translation (along the smaller-overlap axis) to separate FROM `other`. */
	mtv: { axis: Axis; dx: number; dy: number };
};

export class CollisionResolver {
	private readonly tree: QuadTree<Collidable>;

	constructor(bounds: Rect, maxItems = 8, maxDepth = 8) {
		this.tree = new QuadTree<Collidable>(bounds, maxItems, maxDepth);
	}

	add(c: Collidable): void {
		this.tree.insert(c);
	}

	addRect(rect: Rect, kind: CollisionKind): void {
		this.tree.insert({ rect, kind });
	}

	clear(): void {
		this.tree.clear();
	}

	/* Every registered obstacle the candidate strictly overlaps, with kind + overlap + MTV. */
	query(candidate: Rect): Collision[] {
		const out: Collision[] = [];
		for (const other of this.tree.query(candidate)) {
			const overlap = candidate.intersection(other.rect);
			if (!overlap) {
				continue;
			}
			out.push({ other, overlap, mtv: mtvOf(candidate, other.rect, overlap) });
		}
		return out;
	}

	/*
	 * Move `rect` straight UP until its bottom sits `gap` above the highest obstacle sharing
	 * its x-column; never moves it down. One-shot: probe the whole column above the rect's
	 * bottom and take the single highest obstacle top, so it converges immediately and can't
	 * oscillate. This is the unified form of the old per-annotation "clear noteTop" lifts.
	 *
	 * `kinds`, when given, restricts which obstacle kinds count — e.g. above-stave text
	 * clears notes/ties/other text but deliberately ignores diagrams (which draw on top).
	 */
	liftClear(rect: Rect, gap: number, kinds?: CollisionKind[]): Rect {
		// A tall, thin probe down the rect's x-column, ending at the rect's bottom: catches
		// every obstacle in the column whose top is at/above where the rect currently sits.
		const probe = new Rect(rect.x, -FAR, rect.w, FAR + rect.bottom);
		let topMost = Infinity;
		for (const c of this.query(probe)) {
			if (kinds && !kinds.includes(c.other.kind)) {
				continue;
			}
			topMost = Math.min(topMost, c.other.rect.y);
		}
		if (topMost === Infinity) {
			return rect;
		}
		const targetBottom = Math.min(rect.bottom, topMost - gap);
		return rect.translate(0, targetBottom - rect.bottom);
	}

	/*
	 * Push `rect` right until it sits `gap` past every already-placed obstacle of `kind` in
	 * its y-band. Enforces the gap against a neighbor that's merely close (not yet
	 * overlapping), reproducing the running-cursor spacing chord diagrams used.
	 */
	pushRightOf(rect: Rect, kind: CollisionKind, gap: number): Rect {
		// Span everything from far left up to the rect's right edge, within its y-band.
		const probe = new Rect(-FAR, rect.y, FAR + rect.right, rect.h);
		let targetX = rect.x;
		for (const c of this.query(probe)) {
			if (c.other.kind === kind) {
				targetX = Math.max(targetX, c.other.rect.right + gap);
			}
		}
		return rect.translate(targetX - rect.x, 0);
	}

	/*
	 * Shift `rect` horizontally so it sits within `bounds` (the canvas), pulling a box that
	 * overruns the right edge back inside, or pushing one off the left edge back right. Only
	 * moves along x — vertical clipping is handled by growing the crop, not nudging. The left
	 * edge wins if the rect is wider than the available span. `margin` insets both edges.
	 */
	nudgeInsideX(rect: Rect, bounds: Rect, margin = 0): Rect {
		const left = bounds.x + margin;
		const right = bounds.right - margin;
		let dx = 0;
		if (rect.right > right) {
			dx = right - rect.right; // pull left
		}
		if (rect.x + dx < left) {
			dx = left - rect.x; // but never past the left edge
		}
		return rect.translate(dx, 0);
	}

	/*
	 * Registered items that escape `viewport` (the rendered/crop rectangle), with which edges
	 * they cross — the "no-man's land" where content gets clipped. The caller decides whether
	 * to grow the crop or lift the element. Independent of element-vs-element overlap.
	 */
	escaping(viewport: Rect): { item: Collidable; edges: Edge[] }[] {
		const out: { item: Collidable; edges: Edge[] }[] = [];
		for (const item of this.tree.all()) {
			if (viewport.contains(item.rect)) {
				continue;
			}
			const edges: Edge[] = [];
			if (item.rect.y < viewport.y) {
				edges.push('top');
			}
			if (item.rect.bottom > viewport.bottom) {
				edges.push('bottom');
			}
			if (item.rect.x < viewport.x) {
				edges.push('left');
			}
			if (item.rect.right > viewport.right) {
				edges.push('right');
			}
			out.push({ item, edges });
		}
		return out;
	}
}

/* Smallest push to separate `a` from `b`: along whichever axis they overlap least, away
 * from `b`'s center. */
function mtvOf(a: Rect, b: Rect, overlap: Rect): Collision['mtv'] {
	const signX = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
	const signY = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;
	return overlap.w <= overlap.h
		? { axis: 'x', dx: signX * overlap.w, dy: 0 }
		: { axis: 'y', dx: 0, dy: signY * overlap.h };
}
