import { Tuplet, type TupletOptions } from 'vexflow/core';
export type TupletNoteValue = {
    type: string;
    dots: number;
};
export type DisplayTupletOptions = TupletOptions & {
    showNumber?: 'actual' | 'both' | 'none' | null;
    showType?: 'actual' | 'both' | 'none' | null;
    actualValue?: TupletNoteValue | null;
    normalValue?: TupletNoteValue | null;
    curved?: boolean;
    bracketWidth?: number | null;
};
export declare class DisplayTuplet extends Tuplet {
    private readonly curved;
    private readonly bracketWidth;
    constructor(notes: ConstructorParameters<typeof Tuplet>[0], opts?: DisplayTupletOptions);
    draw(): void;
    private arc;
}
