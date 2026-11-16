export declare class GlyphOutline {
    private readonly data;
    private made;
    private commands;
    constructor(data: string);
    path(): Path2D;
    trace(ctx: CanvasRenderingContext2D): void;
}
