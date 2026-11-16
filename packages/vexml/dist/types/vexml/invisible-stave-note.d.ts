import { StaveNote } from 'vexflow/core';
import type { StyleSign } from './score-reader.js';
export declare class InvisibleStaveNote extends StaveNote {
    spacingHidden: boolean;
    sign: StyleSign | null;
    constructor(...args: ConstructorParameters<typeof StaveNote>);
    draw(): void;
}
