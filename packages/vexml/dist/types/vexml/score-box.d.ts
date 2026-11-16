import { type Resource } from '../core/disposable/index.js';
import type { Ink } from './ink.js';
export interface ScoreBoxOptions {
    height?: number | null;
    maxHeight?: number | null;
    width?: number | null;
    maxWidth?: number | null;
    backgroundColor?: string | null;
    fit?: boolean;
}
export interface PaintedTiles {
    readonly key: string;
    readonly plane: HTMLElement;
}
export declare class ScoreBox implements Resource {
    readonly container: HTMLDivElement;
    readonly base: HTMLDivElement;
    private readonly priors;
    private painted;
    private readonly disposer;
    private constructor();
    static open(container: HTMLDivElement, opts: ScoreBoxOptions): ScoreBox;
    static paintKey(fingerprint: string, density: number, ink: Ink): string;
    get isPainted(): boolean;
    takePainted(): PaintedTiles | null;
    mark(key: string): void;
    setStyle(prop: string, value: string): void;
    size(width: number, height: number, scale: number): void;
    renderedSize(): {
        width: number;
        height: number;
    };
    dispose(): void;
    private takeOver;
    private build;
}
