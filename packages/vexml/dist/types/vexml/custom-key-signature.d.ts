import { StaffKeySignature } from './staff-scaled-signatures.js';
export declare class CustomKeySignature extends StaffKeySignature {
    private readonly accidentals;
    constructor(accidentals: ReadonlyArray<{
        type: string;
        line: number;
    }>);
    format(): void;
}
