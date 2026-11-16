import { TechnicalAnnotation } from './technical-annotation.js';
export declare class StringNumberAnnotation extends TechnicalAnnotation {
    constructor(number: string, below: boolean);
    rowHeight(): number;
    private ringCenterY;
    protected textBaselineY(): number;
    draw(): void;
}
