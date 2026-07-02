import type { MElement } from '@stringsync/mdom';
import type { NoteGlyph } from '../engraving/score-drawer';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import {
	type Decorations,
	Element,
	type Highlightable,
	stampGlyph,
	Toggle,
} from './element';
import type { Note } from './note';

/* A fret number on a tab string. The same note can render as both a Note (notehead) and a
 * TabPosition (fret); they cross-reference via Note.getTabPosition() / TabPosition.getNote(). */
export class TabPosition extends Element implements Highlightable {
	readonly type = 'tab-position';
	readonly color: Toggle;
	readonly halo: Toggle;

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: {
			string: number;
			fret: number;
			note: Note;
			decorations: Decorations;
			/* The engraved fret glyph ("5", "<7>", "(2)", "✕") captured with vexflow's exact
			 * baseline, so a decoration replays the digit recolored. Null when no fret was drawn
			 * (a tie-stop/held string omits its number) — nothing on the tab to recolor. */
			glyph: NoteGlyph | null;
		},
	) {
		super(rect, viewport);
		this.color = new Toggle(this, opts.decorations.color);
		this.halo = new Toggle(this, opts.decorations.halo);
	}

	/* The same mdom note its Note wraps — one source of truth for both renderings. */
	getSources(): readonly MElement[] {
		return this.opts.note.getSources();
	}

	/* Replay vexflow's own fret glyph recolored so the digit lights up exactly where it was
	 * engraved. No glyph means the fret was omitted (a tie-stop/held string), so there's nothing
	 * to recolor — draw nothing rather than stamping a phantom ellipse blip on an empty string. */
	override drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		if (this.opts.glyph) {
			stampGlyph(ctx, this.opts.glyph, color);
		}
	}

	getString(): number {
		return this.opts.string;
	}

	getFret(): number {
		return this.opts.fret;
	}

	getNote(): Note {
		return this.opts.note;
	}
}
