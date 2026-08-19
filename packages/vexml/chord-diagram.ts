import type { Harmony } from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import type { ChordFrame } from './chord-diagram-glyph';
import type { Decorations } from './decoration';
import { Element, type Highlightable, Toggle } from './element';
import type { Viewport } from './viewport';

/* A rendered chord diagram (the fret box a <harmony> with a <frame> draws above the stave).
 * Decorations use the base ellipse/halo fallback — there's no single glyph to restamp. Not in the
 * pointer tree in v1: reachable via ElementIndex.chordDiagrams(), not by hit-testing. */
/* What a ChordDiagram is built from: the <harmony> it came from, the fingering it draws,
 * its printed chord name, and the decoration stores its toggles delegate to. */
export interface ChordDiagramOptions {
	source: Harmony;
	frame: ChordFrame;
	/* The chord name printed above the box ("Gm7b5"), or null when the frame has no symbol text. */
	title: string | null;
	decorations: Decorations;
}

export class ChordDiagram extends Element implements Highlightable {
	readonly type = 'chord-diagram';
	readonly color: Toggle;
	readonly halo: Toggle;

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: ChordDiagramOptions,
	) {
		super(rect, viewport);
		this.color = new Toggle(this, opts.decorations.color);
		this.halo = new Toggle(this, opts.decorations.halo);
	}

	getSources(): readonly Harmony[] {
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
