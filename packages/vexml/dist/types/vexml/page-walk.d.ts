import type { SystemExtent } from './draw-pass.js';
import type { DocumentPlacement, PagePlan } from './page-planner.js';
export declare class PageWalk {
    private readonly height;
    private readonly marginTop;
    private readonly marginBottom;
    private index;
    private cropTop;
    private readonly pages;
    private bottom;
    private startPage;
    constructor(height: number, marginTop: number, marginBottom: number);
    place(extent: SystemExtent, document?: DocumentPlacement): number;
    placedPage(): number;
    result(): Pick<PagePlan, 'cropTop' | 'pageCount' | 'pageHeights'>;
    private openPage;
}
