import { KeySignature, type Stave, type TimeSignature } from 'vexflow/core';
export interface KeyPitch {
    step: string;
    alter: number;
}
export interface DrawnKeyAccidental extends KeyPitch {
    x: number;
    y: number;
    w: number;
    h: number;
}
export declare function staveRatio(stave: Stave): number;
export declare abstract class StaffKeySignature extends KeySignature {
    getAccidentals(): DrawnKeyAccidental[];
    opensStave(): boolean;
    protected abstract pitchOf(acc: {
        type: string;
        line: number;
    }, index: number): KeyPitch;
    protected convertToGlyph(acc: {
        type: string;
        line: number;
    }, nextAcc: {
        type: string;
        line: number;
    }, stave: Stave): void;
}
export declare function scaleTimeSignature(sig: TimeSignature, stave: Stave): void;
