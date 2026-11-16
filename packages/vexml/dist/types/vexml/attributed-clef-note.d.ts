import { ClefNote } from 'vexflow/core';
/** ClefNote renders text without VexFlow's clef group. Keep the mid-measure glyph
 * distinct from the ordinary text a diagnostic replay checks against the staff. */
export declare class AttributedClefNote extends ClefNote {
    draw(): void;
}
