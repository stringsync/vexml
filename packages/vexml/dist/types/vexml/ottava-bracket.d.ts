import { BoundingBox, TextBracket } from 'vexflow/core';
export declare class OttavaBracket extends TextBracket {
    private customGlyph;
    private customBaseline;
    private customEndX;
    useGlyph(glyph: string, notationFont: string): this;
    runToBarline(x: number): this;
    setLayoutBaseline(y?: number): void;
    getBoundingBox(): BoundingBox;
    draw(): void;
    private syncFont;
    private layout;
    private stopRightEdge;
}
