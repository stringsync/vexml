import { Rect } from "./rect";

type Entry<T> = { item: T; bounds: Rect };

export interface QuadTreeOptions {
	/** How many items a node holds before it splits into four. Defaults to 8. */
	capacity?: number;
	/**
	 * How many times the tree may split before it gives up and lets a node grow
	 * past its capacity. Defaults to 8, which is 65536 leaves at the bottom.
	 * Without it, items stacked on the same point would split forever.
	 */
	maxDepth?: number;
}

/**
 * An index of rectangles by where they are, so "what is under the cursor" and
 * "what overlaps this" do not have to touch every item.
 *
 * ```ts
 * const tree = new QuadTree<Note>(new Rect(0, 0, 1000, 1000));
 * for (const note of notes) {
 *   tree.insert(note, note.bounds);
 * }
 * tree.query(viewport); // only the notes that could be on screen
 * ```
 *
 * `query` is a first pass, not an answer: it returns everything whose bounds
 * overlap the area, which for anything that is not a rectangle is more than
 * actually hits. Test the survivors properly.
 *
 * There is no `remove`. Rebuilding costs about what a scattering of removals
 * does, and a tree that is never edited cannot go stale behind an item that
 * moved.
 */
export class QuadTree<T> {
	private readonly capacity: number;
	private readonly maxDepth: number;
	private readonly entries: Entry<T>[] = [];
	private children: QuadTree<T>[] = [];

	constructor(
		readonly bounds: Rect,
		opts: QuadTreeOptions = {},
	) {
		this.capacity = opts.capacity ?? 8;
		this.maxDepth = opts.maxDepth ?? 8;
	}

	/**
	 * Adds an item at the given bounds. Bounds outside the tree's own are still
	 * found by `query`, they just sit at the root rather than being indexed.
	 */
	insert(item: T, bounds: Rect): void {
		const child = this.children.find((quadrant) =>
			quadrant.bounds.containsRect(bounds),
		);
		// An item straddling two quadrants belongs to neither, so it stays here.
		// Pushing it into both would return it twice from a query that spans the
		// seam.
		if (child === undefined) {
			this.entries.push({ item, bounds });
			if (this.entries.length > this.capacity && this.children.length === 0) {
				this.split();
			}
			return;
		}
		child.insert(item, bounds);
	}

	/** Every item whose bounds overlap the area, in no particular order. */
	query(area: Rect): T[] {
		const found: T[] = [];
		// The root skips the bounds check every node below it does, because an
		// item inserted outside the tree is held right here and a query out there
		// would never reach it otherwise.
		this.collectHere(area, found);
		for (const child of this.children) {
			child.collect(area, found);
		}
		return found;
	}

	clear(): void {
		this.entries.length = 0;
		this.children = [];
	}

	/** How many items the tree holds, at this node and below it. */
	get size(): number {
		return this.children.reduce(
			(total, child) => total + child.size,
			this.entries.length,
		);
	}

	private collect(area: Rect, found: T[]): void {
		if (!this.bounds.intersects(area)) {
			return;
		}
		this.collectHere(area, found);
		for (const child of this.children) {
			child.collect(area, found);
		}
	}

	private collectHere(area: Rect, found: T[]): void {
		for (const entry of this.entries) {
			if (entry.bounds.intersects(area)) {
				found.push(entry.item);
			}
		}
	}

	private split(): void {
		if (this.maxDepth === 0) {
			return;
		}
		const halfW = this.bounds.w / 2;
		const halfH = this.bounds.h / 2;
		const left = this.bounds.x;
		const top = this.bounds.y;
		const opts = { capacity: this.capacity, maxDepth: this.maxDepth - 1 };
		this.children = [
			new QuadTree<T>(new Rect(left, top, halfW, halfH), opts),
			new QuadTree<T>(new Rect(left + halfW, top, halfW, halfH), opts),
			new QuadTree<T>(new Rect(left, top + halfH, halfW, halfH), opts),
			new QuadTree<T>(new Rect(left + halfW, top + halfH, halfW, halfH), opts),
		];
		// Re-inserting sends what fits down into a quadrant and leaves the rest
		// where it was.
		const held = this.entries.splice(0);
		for (const entry of held) {
			this.insert(entry.item, entry.bounds);
		}
	}
}
