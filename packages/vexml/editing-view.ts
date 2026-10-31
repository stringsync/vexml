import type { Rect } from 'core/geometry';
import type { Barline } from './barline';
import type { Measure } from './measure';
import type { Note } from './note';

export interface EditingPresentation {
	/** Active drag rectangle in score coordinates; selection is a preview until release. */
	readonly marquee?: Rect;
	readonly selected: readonly Note[];
	readonly focus: Note | null;
	/** Zero-width step-entry caret on its target staff, in score coordinates. */
	readonly caret: Rect | null;
	/** Selected per-part measures, in part order; empty unless a measure range is selected. */
	readonly measures: readonly Measure[];
	/** The selected barline to highlight; null when none is selected or the selected edge is not drawn. */
	readonly barline: Barline | null;
	/** The measure a range last moved to, or the selected barline. */
	readonly structuralFocus: Measure | Barline | null;
	/** The caret, focus glyph, its measure box if it has no indexed glyph, or the structural focus. */
	readonly position: Rect | null;
}

/** Independent from playback's view and decoration color channels. */
export interface EditingView {
	render(state: EditingPresentation): void;
	dispose(): void;
}
