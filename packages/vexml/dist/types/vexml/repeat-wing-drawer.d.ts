import { Rect } from '../core/geometry/index.js';
import { type RenderContext, type Stave } from 'vexflow/core';
import type { Winged } from './score-reader.js';
export declare class RepeatWingDrawer {
    private readonly context;
    constructor(context: RenderContext);
    draw(top: Stave, bottom: Stave, wings: {
        begin: Winged;
        end: Winged;
        reopen: Winged;
    }): Rect[];
    private repeatX;
    private drawSign;
    private drawWing;
}
