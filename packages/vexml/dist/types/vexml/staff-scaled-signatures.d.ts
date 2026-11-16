import { KeySignature, type Stave, type TimeSignature } from 'vexflow/core';
export declare function staveRatio(stave: Stave): number;
export declare class StaffKeySignature extends KeySignature {
    protected convertToGlyph(acc: {
        type: string;
        line: number;
    }, nextAcc: {
        type: string;
        line: number;
    }, stave: Stave): void;
}
export declare function scaleTimeSignature(sig: TimeSignature, stave: Stave): void;
