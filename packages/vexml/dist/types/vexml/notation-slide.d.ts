import { type RenderContext, type StaveNote } from 'vexflow/core';
export type NotationSlideOptions = {
    fromIndex: number;
    toIndex: number;
    dash?: number[] | null;
};
export declare class NotationSlide {
    private readonly from;
    private readonly to;
    private context?;
    private readonly dash;
    private readonly fromIndex;
    private readonly toIndex;
    constructor(from: StaveNote, to: StaveNote, opts: NotationSlideOptions);
    setContext(context: RenderContext): this;
    draw(): void;
}
