import { Rect } from '../core/geometry/index.js';
import type { RenderContext, Stave, StaveNote } from 'vexflow/core';
export type HairpinOptions = {
    crescendo: boolean;
    placement: 'above' | 'below';
    dash?: number[] | null;
    niente?: boolean;
    spread?: number | null;
    runsOff?: 'left' | 'right';
    edgeX?: number;
    openPoint?: boolean;
    stopOnDownbeat?: boolean;
    stopPositioned?: boolean;
};
export declare class Hairpin {
    private readonly from;
    private readonly to;
    private context?;
    private readonly dash;
    private readonly niente;
    private readonly crescendo;
    private readonly placement;
    private readonly spread;
    private readonly runsOff;
    private readonly edgeX;
    private readonly openPoint;
    private readonly stopOnDownbeat;
    private readonly stopPositioned;
    constructor(from: StaveNote, to: StaveNote, opts: HairpinOptions);
    private offset;
    private startInset;
    private endInset;
    private lineWidth;
    setContext(context: RenderContext): this;
    setOffset(offset: number): this;
    getOffset(): number;
    setHorizontalInsets(start: number, end: number): this;
    setEndInset(end: number): this;
    setLineWidth(lineWidth: number | null): this;
    get stave(): Stave;
    get endStave(): Stave;
    get isWrapped(): boolean;
    get endsOnDownbeat(): boolean;
    get hasPositionedEnd(): boolean;
    get above(): boolean;
    get opens(): boolean;
    private span;
    /** The band the wedge occupies, for the caller's page crop and clearance check. */
    get bounds(): {
        top: number;
        bottom: number;
    };
    /** The box the wedge is drawn in: the band above, over the notes it spans. */
    get rect(): Rect;
    draw(): void;
}
