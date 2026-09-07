import type { Rect } from 'webappwiz/geometry';
import type { Note } from './note';

export interface EditingPresentation {
	/** Active drag rectangle in score coordinates; selection is a preview until release. */
	readonly marquee?: Rect;
	readonly selected: readonly Note[];
	readonly focus: Note | null;
	/** The focus glyph, or its measure box if it has no indexed glyph. */
	readonly position: Rect | null;
}

/** Independent from playback's view and decoration color channels. */
export interface EditingView {
	render(state: EditingPresentation): void;
	dispose(): void;
}
