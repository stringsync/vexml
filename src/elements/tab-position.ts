import type { MElement } from '@stringsync/mdom';
import type { NoteGlyph } from '../engraving/score-drawer';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import {
	ColorToggle,
	type Decorator,
	Element,
	HaloToggle,
	type Highlightable,
	stampGlyph,
	type Toggle,
} from './element';
import type { Note } from './note';

/* A fret number on a tab string. The same note can render as both a Note (notehead) and a
 * TabPosition (fret); they cross-reference via Note.getTabPosition() / TabPosition.getNote(). */
export class TabPosition extends Element implements Highlightable {
	readonly type = 'tab-position';
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: {
			string: number;
			fret: number;
			note: Note;
			decorator: Decorator;
			/* The engraved fret glyph ("5", "<7>", "(2)", "✕") captured with vexflow's exact
			 * baseline, so a decoration replays the digit recolored; null falls back to an ellipse. */
			glyph: NoteGlyph | null;
		},
	) {
		super(rect, viewport);
		this.color = new ColorToggle(this, opts.decorator);
		this.halo = new HaloToggle(this, opts.decorator);
	}

	/* The same mdom note its Note wraps — one source of truth for both renderings. */
	getSources(): readonly MElement[] {
		return this.opts.note.getSources();
	}

	/* Replay vexflow's own fret glyph recolored so the digit lights up exactly where it was
	 * engraved, rather than vanishing under a filled ellipse. Same approach as a notehead. */
	override drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		if (this.opts.glyph) {
			stampGlyph(ctx, this.opts.glyph, color);
		} else {
			super.drawColor(ctx, color);
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
