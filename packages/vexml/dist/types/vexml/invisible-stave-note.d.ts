import { type StaveNote } from 'vexflow/core';
import type { StyleSign } from './score-reader.js';
import { VexmlStaveNote } from './vexml-stave-note.js';
export declare class InvisibleStaveNote extends VexmlStaveNote {
    spacingHidden: boolean;
    sign: StyleSign | null;
    constructor(...args: ConstructorParameters<typeof StaveNote>);
    draw(): void;
}
