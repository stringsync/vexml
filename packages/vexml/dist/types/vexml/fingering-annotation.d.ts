import { TechnicalAnnotation } from './technical-annotation.js';
export interface FingeringAnnotationOptions {
    /** Set in italic typeface (Behind Bars p. 374: right-hand `<pluck>` letters `p`, `i`, `m`, `a`). */
    italic?: boolean;
}
export declare class FingeringAnnotation extends TechnicalAnnotation {
    readonly italic: boolean;
    constructor(text: string, below: boolean, opts?: FingeringAnnotationOptions);
    rowHeight(): number;
}
