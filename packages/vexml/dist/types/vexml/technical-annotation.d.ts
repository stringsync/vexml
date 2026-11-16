import { Annotation } from 'vexflow/core';
import type { TechnicalMark } from './technical-mark.js';
export declare abstract class TechnicalAnnotation extends Annotation implements TechnicalMark {
    /** Which side of the stave this mark stacks on (<technical placement>). */
    readonly below: boolean;
    readonly kind: 'technical';
    protected baselineY: number;
    constructor(text: string, 
    /** Which side of the stave this mark stacks on (<technical placement>). */
    below: boolean);
    /** How much vertical room this mark claims in its column, ink plus air. */
    abstract rowHeight(): number;
    setBaselineY(y: number): void;
    /** Where the text's own baseline goes: the row's bottom edge, unless a subclass draws
     * something around the text that it has to sit inside. */
    protected textBaselineY(): number;
    draw(): void;
}
