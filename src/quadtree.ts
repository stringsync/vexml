import { Rect } from './geometry';

/*
 * A region quadtree of rect-bearing items, used by CollisionDetector as the broad-phase
 * spatial index. Items live at the deepest node whose bounds fully contain them; a node
 * splits into four quadrants once it holds more than `maxItems` (until `maxDepth`). An item
 * straddling a split line stays at the parent.
 *
 * "No-man's land": a standard quadtree clamps to its root and silently drops anything
 * outside. This one instead keeps such items in a separate `outside` bucket (only at the
 * root) that `query` always consults — so content escaping the page bounds is still found,
 * which is what powers the clip detection (CollisionDetector.escaping).
 *
 * Items are inserted only after their final position is resolved (notes are placed once;
 * an annotation is nudged, then inserted), so a rect already in the tree is never moved —
 * there is no rebuild-on-move path to get wrong.
 */
export class QuadTree<T extends { rect: Rect }> {
	private items: T[] = [];
	private children: QuadTree<T>[] | null = null;
	private readonly outsideItems: T[] = [];

	constructor(
		private readonly bounds: Rect,
		private readonly maxItems = 8,
		private readonly maxDepth = 8,
		private readonly depth = 0,
	) {}

	/* Insert an item. Items not fully inside the root bounds go to the outside bucket. */
	insert(item: T): void {
		if (this.bounds.contains(item.rect)) {
			this.insertInto(item);
		} else {
			this.outsideItems.push(item);
		}
	}

	private insertInto(item: T): void {
		if (this.children) {
			const child = this.children.find((c) => c.bounds.contains(item.rect));
			if (child) {
				child.insertInto(item);
				return;
			}
			// Straddles a quadrant boundary — keep it at this node.
			this.items.push(item);
			return;
		}
		this.items.push(item);
		if (this.items.length > this.maxItems && this.depth < this.maxDepth) {
			this.split();
		}
	}

	private split(): void {
		const { x, y, w, h } = this.bounds;
		const hw = w / 2;
		const hh = h / 2;
		const mk = (bx: number, by: number) =>
			new QuadTree<T>(
				new Rect(bx, by, hw, hh),
				this.maxItems,
				this.maxDepth,
				this.depth + 1,
			);
		this.children = [
			mk(x, y),
			mk(x + hw, y),
			mk(x, y + hh),
			mk(x + hw, y + hh),
		];
		const pending = this.items;
		this.items = [];
		for (const item of pending) {
			this.insertInto(item);
		}
	}

	/*
	 * Every stored item whose rect strictly intersects `area` — including outside-bucket
	 * items. Broad phase: callers still do the exact overlap test they need.
	 */
	query(area: Rect): T[] {
		const out: T[] = [];
		this.queryTree(area, out);
		for (const item of this.outsideItems) {
			if (item.rect.intersects(area)) {
				out.push(item);
			}
		}
		return out;
	}

	private queryTree(area: Rect, out: T[]): void {
		if (!this.bounds.intersects(area)) {
			return;
		}
		for (const item of this.items) {
			if (item.rect.intersects(area)) {
				out.push(item);
			}
		}
		if (this.children) {
			for (const child of this.children) {
				child.queryTree(area, out);
			}
		}
	}

	/* Items that fell outside the root bounds (the "no-man's land" overflow). */
	outside(): T[] {
		return [...this.outsideItems];
	}

	/* Every item in the tree, including the outside bucket. For whole-set scans like the
	 * clip check (CollisionDetector.escaping), which must see items the query area misses. */
	all(): T[] {
		const out: T[] = [];
		this.collect(out);
		out.push(...this.outsideItems);
		return out;
	}

	private collect(out: T[]): void {
		for (const item of this.items) {
			out.push(item);
		}
		if (this.children) {
			for (const child of this.children) {
				child.collect(out);
			}
		}
	}

	clear(): void {
		this.items = [];
		this.children = null;
		this.outsideItems.length = 0;
	}
}
