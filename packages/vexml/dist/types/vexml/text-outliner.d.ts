import type { LoadedFont } from './headless-fonts.js';
import type { ScoreSnapshot } from './score-snapshot.js';
export declare class TextOutliner {
    private readonly fonts;
    private readonly glyphs;
    private readonly glyphIndex;
    private readonly forms;
    private readonly formIndex;
    constructor(loaded: readonly LoadedFont[]);
    outline(snapshot: ScoreSnapshot): ScoreSnapshot;
    private place;
    private glyph;
    private form;
}
