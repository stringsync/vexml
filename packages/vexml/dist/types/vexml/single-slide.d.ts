import { type RenderContext, type StaveNote, type TabNote } from 'vexflow/core';
export declare class SingleSlide {
    private readonly note;
    private readonly index;
    private readonly kind;
    private readonly extraPad;
    private context?;
    constructor(note: StaveNote | TabNote, index: number, kind: 'in' | 'out', extraPad: number);
    setContext(context: RenderContext): this;
    draw(): void;
}
