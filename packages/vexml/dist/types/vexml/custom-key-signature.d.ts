import { type KeyPitch, StaffKeySignature } from './staff-scaled-signatures.js';
export interface CustomKeyAccidental extends KeyPitch {
    type: string;
    line: number;
}
export declare class CustomKeySignature extends StaffKeySignature {
    private readonly accidentals;
    constructor(accidentals: readonly CustomKeyAccidental[]);
    protected pitchOf(_acc: {
        type: string;
        line: number;
    }, index: number): KeyPitch;
    format(): void;
}
