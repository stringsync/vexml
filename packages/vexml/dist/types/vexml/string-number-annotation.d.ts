import { TechnicalAnnotation } from './technical-annotation.js';
export declare class StringNumberAnnotation extends TechnicalAnnotation {
    private readonly explicitPlacement;
    constructor(number: string, below: boolean, explicitPlacement?: boolean);
    /** Place an unplaced string designation below the stave in lower-voice writing. */
    placeLowerVoiceBelow(): this;
    rowHeight(): number;
    private ringCenterY;
    protected textBaselineY(): number;
    draw(): void;
}
