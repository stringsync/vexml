import { Stave } from 'vexflow/core';
export interface LineStyle {
    /** Stave row, 0 at the top, as vexflow counts. */
    row: number;
    /** Thickness in px; null keeps the stave's own. */
    width: number | null;
    color: string | null;
    /** Dash pattern in px; empty draws a solid line. */
    dash: number[];
}
export declare class DetailedStave extends Stave {
    private readonly styledLines;
    constructor(x: number, y: number, width: number, styledLines: LineStyle[], options: ConstructorParameters<typeof Stave>[3]);
    draw(): void;
}
