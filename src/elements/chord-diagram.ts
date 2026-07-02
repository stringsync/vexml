import type { MElement } from '@stringsync/mdom';
import type { ChordFrame } from '../engraving/chord-diagram-glyph';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import {
	type Decorations,
	DecorationToggle,
	Element,
	type Highlightable,
	type Toggle,
} from './element';

/* A rendered chord diagram (the fret box a <harmony> with a <frame> draws above the stave).
 * Decorations use the base ellipse/halo fallback — there's no single glyph to restamp. Not in the
 * pointer tree in v1: reachable via ElementIndex.chordDiagrams(), not by hit-testing. */
export class ChordDiagram extends Element implements Highlightable {
	readonly type = 'chord-diagram';
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: {
			/* The raw <harmony> MElement that produced this diagram (mdom doesn't type harmony). */
			source: MElement;
			frame: ChordFrame;
			title: string | null;
			decorations: Decorations;
		},
	) {
		super(rect, viewport);
		this.color = new DecorationToggle(this, opts.decorations.color);
		this.halo = new DecorationToggle(this, opts.decorations.halo);
	}

	getSources(): readonly MElement[] {
		return [this.opts.source];
	}

	/* The chord name printed above the box ("Gm7b5"), or null when the frame has no symbol text. */
	getTitle(): string | null {
		return this.opts.title;
	}

	/* The fingering the box draws: per-string frets/mutes plus any barres. */
	getFrame(): ChordFrame {
		return this.opts.frame;
	}
}
