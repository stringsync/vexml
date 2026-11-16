import type { RenderContext, TabSlide } from 'vexflow/core';
export declare class TabSlideLine {
    private readonly slide;
    private context?;
    constructor(slide: TabSlide);
    setContext(context: RenderContext): this;
    draw(): void;
}
