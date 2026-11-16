import type { SystemExtent } from './draw-pass.js';
import type { DocumentSystem } from './layout-planner.js';
import { PageWalk } from './page-walk.js';
export interface PagePlan {
    pushes: Map<number, number>;
    cropTop: number;
    pageCount: number;
    pageHeights: number[];
}
export interface DocumentPages {
    lines: readonly SystemExtent[];
    systems: readonly DocumentSystem[];
}
export interface DocumentPlacement {
    lines: SystemExtent;
    system: DocumentSystem;
}
export declare class PagePlanner {
    private readonly pageHeight;
    private readonly marginTop;
    private readonly marginBottom;
    constructor(pageHeight: number, marginTop: number, marginBottom: number);
    plan(extents: readonly SystemExtent[], document?: DocumentPages): PagePlan;
    walk(): PageWalk;
}
