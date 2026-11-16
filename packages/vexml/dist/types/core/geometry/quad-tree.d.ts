import { Rect } from "./rect.js";
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
export declare class QuadTree<T> {
    readonly bounds: Rect;
    private readonly capacity;
    private readonly maxDepth;
    private readonly entries;
    private children;
    constructor(bounds: Rect, opts?: QuadTreeOptions);
    /**
     * Adds an item at the given bounds. Bounds outside the tree's own are still
     * found by `query`, they just sit at the root rather than being indexed.
     */
    insert(item: T, bounds: Rect): void;
    /** Every item whose bounds overlap the area, in no particular order. */
    query(area: Rect): T[];
    clear(): void;
    /** How many items the tree holds, at this node and below it. */
    get size(): number;
    private collect;
    private collectHere;
    private split;
}
