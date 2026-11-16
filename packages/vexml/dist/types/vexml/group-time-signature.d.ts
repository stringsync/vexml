import type { RenderContext, Stave, TimeSignature } from 'vexflow/core';
export declare class GroupTimeSignature {
    private readonly source;
    /** How much larger than a single stave's signature the group's draws. */
    readonly scale: number;
    /** Where the placeholders sit; null until a stave of the group has drawn its modifiers. */
    x: number | null;
    constructor(source: TimeSignatureSource, 
    /** How much larger than a single stave's signature the group's draws. */
    scale: number);
    /** The scale for a group spanning this many staves: taller groups get larger digits, up to a cap. */
    static scaleFor(staveCount: number): number;
    placeholder(): TimeSignature;
    draw(ctx: RenderContext, top: Stave, bottom: Stave): void;
}
/** Builds a fresh time signature each time it is asked, since a vexflow one draws once. */
export interface TimeSignatureSource {
    make(): TimeSignature;
}
