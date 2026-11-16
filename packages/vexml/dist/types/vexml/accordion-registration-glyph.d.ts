import type { RenderContext } from 'vexflow/core';
export declare class AccordionRegistrationGlyph {
    private readonly ranks;
    private readonly diameter;
    constructor(ranks: {
        high: boolean;
        middle: number;
        low: boolean;
    }, diameter: number);
    draw(context: RenderContext, x: number, y: number): void;
}
