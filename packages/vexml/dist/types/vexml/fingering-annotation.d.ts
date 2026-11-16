import { TechnicalAnnotation } from './technical-annotation.js';
export declare class FingeringAnnotation extends TechnicalAnnotation {
    constructor(text: string, below: boolean);
    rowHeight(): number;
}
