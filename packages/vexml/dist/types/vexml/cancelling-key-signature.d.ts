import type { KeySignature } from 'vexflow/core';
import { StaffKeySignature } from './staff-scaled-signatures.js';
export declare class CancellingKeySignature extends StaffKeySignature {
    private readonly keyClef;
    private readonly naturalsAfter;
    constructor(keySpec: string, cancelKeySpec: string | undefined, keyClef: string, naturalsAfter: boolean);
    protected convertAccLines(_clef: string, type?: string, accList?: Array<{
        type: string;
        line: number;
    }>): void;
    protected convertToCancelAccList(spec: string): ReturnType<KeySignature['convertToCancelAccList']>;
}
