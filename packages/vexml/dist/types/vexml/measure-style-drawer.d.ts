import { type RenderContext, type Stave } from 'vexflow/core';
import type { MeasureStyleMark, StyleSign } from './score-reader.js';
export declare class MeasureStyleDrawer {
    private readonly context;
    constructor(context: RenderContext);
    draw(stave: Stave, mark: MeasureStyleMark): void;
    private drawMeasureRepeat;
    private drawPerBeat;
    drawSign(stave: Stave, sign: StyleSign, x: number): void;
    private drawSlash;
    private drawCentered;
}
