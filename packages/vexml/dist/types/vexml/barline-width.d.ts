import { type RenderContext, type Stave } from 'vexflow/core';
import type { Appearance } from './appearance.js';
export type BarKind = 'light' | 'heavy';
export type BarStroke = BarKind | 'ordinary';
export declare class BarlineWidths {
    private static light;
    private static heavy;
    private static beam;
    set(light: number | null, heavy: number | null, beam: number): void;
    static current(): Record<BarStroke, number>;
    static custom(): boolean;
}
export declare function barRects(kinds: readonly BarStroke[], gap?: number): Array<[offset: number, width: number]>;
type BarConnectorType = 'singleLeft' | 'singleRight' | 'thinDouble' | 'boldDoubleLeft' | 'boldDoubleRight' | 'final';
interface BarConnectorOptions {
    top: Stave;
    bottom: Stave;
    type: BarConnectorType;
    xShift?: number;
}
export declare function drawBarConnector(ctx: RenderContext, opts: BarConnectorOptions): void;
export declare function openingRepeatLeftOffset(): number;
export declare function thinDoubleGap(staveSpace: number): number;
export declare function drawsFinalBarline(style: string | null, last: boolean, repeatEnd: boolean, connected: boolean): boolean;
export declare function finalBarlineInset(spacing: number, appearance: Appearance): number;
export declare function repeatEndPadding(spacing: number, appearance: Appearance): number;
export declare function closingBarRects(spacing: number): Array<[offset: number, width: number]>;
export declare function fillBars(stave: Stave, x: number, rects: Array<[offset: number, width: number]>): void;
export declare function drawRepeat(stave: Stave, x: number, begin: boolean, barSpacing: number): void;
export {};
