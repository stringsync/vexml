import type { Measure as MMeasure, Part as MPart } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import type { ElementIndex } from './element-index.js';
/** A step-entry insertion point. Onset is in quarter-note beats from the measure start. */
export interface EditingCaret {
    readonly part: MPart;
    readonly voice: string;
    readonly staff: number;
    readonly measure: MMeasure;
    readonly onset: number;
}
/** Resolve a document target against this render without changing the document. */
export declare function editingCaretRect(index: ElementIndex, target: EditingCaret): Rect | null;
