import { Volta } from 'vexflow/core';
import type { VoltaDecoration } from './barline-translator.js';
export type EndingVoltaOptions = {
    /** The bracket's line width (`<line-width type="ending">`); vexflow's 1px when null. */
    lineWidth?: number | null;
};
export declare class EndingVolta extends Volta {
    private readonly decoration;
    private readonly lineWidth;
    constructor(decoration: VoltaDecoration, x: number, yShift: number, opts?: EndingVoltaOptions);
    draw(): void;
}
