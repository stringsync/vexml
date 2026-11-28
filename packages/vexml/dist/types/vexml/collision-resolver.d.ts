import { type QuadTreeOptions, Rect } from '../core/geometry/index.js';
export declare class CollisionResolver {
    private readonly tree;
    private readonly registered;
    constructor(bounds: Rect, opts: QuadTreeOptions);
    add(c: Collidable): void;
    clear(): void;
    query(candidate: Rect): Collision[];
    liftClear(rect: Rect, gap: number, opts: ClearOptions): Rect;
    dropClear(rect: Rect, gap: number, opts: ClearOptions): Rect;
    pushRightOf(rect: Rect, kind: CollisionKind, gap: number): Rect;
    nudgeInsideX(rect: Rect, bounds: Rect, margin: number): Rect;
    escaping(viewport: Rect): {
        item: Collidable;
        edges: Edge[];
    }[];
    private mtvOf;
}
export type CollisionKind = 'note' | 'stem' | 'tie' | 'annotation' | 'lyric' | 'diagram' | 'hairpin';
type Collidable = {
    rect: Rect;
    kind: CollisionKind;
    band?: number;
};
type Axis = 'x' | 'y';
type Edge = 'top' | 'bottom' | 'left' | 'right';
type Collision = {
    other: Collidable;
    overlap: Rect;
    mtv: {
        axis: Axis;
        dx: number;
        dy: number;
    };
};
export interface ClearOptions {
    kinds?: CollisionKind[];
    band?: number;
    xMargin?: number;
}
export {};
