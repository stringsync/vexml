import { type RenderContext, type Stave, type StaveConnectorType } from 'vexflow/core';
export type BarKind = 'light' | 'heavy';
export declare class BarlineWidths {
    private static installed;
    private static light;
    private static heavy;
    set(light: number | null, heavy: number | null): void;
    static current(): {
        light: number;
        heavy: number;
    };
    static custom(): boolean;
}
export declare function barRects(kinds: readonly BarKind[], gap?: number): Array<[offset: number, width: number]>;
interface BarConnectorOptions {
    top: Stave;
    bottom: Stave;
    type: StaveConnectorType;
    xShift?: number;
}
export declare function drawBarConnector(ctx: RenderContext, opts: BarConnectorOptions): void;
export {};
