import type { Chord, Harmony, Note as MNote } from '@stringsync/mdom';
import {
	type Element,
	Modifier,
	type StaveNote,
	Stem,
	Stroke,
	type TabNote,
	type TabStave,
} from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import type { ChordFrame } from './chord-diagram-glyph';
import { FRET_HALF_H, FRET_HALF_W, NOTEHEAD_HALF_H } from './constants';
import type { TextOutline } from './text-outline';

/* A note's engraved glyph, captured so a decoration can re-stamp it in color on an overlay: the
 * SMuFL text, the exact CSS font vexflow drew it with, and its baseline position in score space.
 * Replaying vexflow's own fillText reproduces the notehead precisely: hollow notes stay hollow. */
export interface NoteGlyph {
	readonly text: string;
	readonly font: string;
	readonly x: number;
	readonly y: number;
	/* Its outline, from a snapshot that carries one: stamped instead, so a note recolors before
	 * the font has loaded. */
	readonly outline?: TextOutline;
}

/* A notehead or fret the draw pass laid out, in score space. `tab` is set when this is a tab
 * fret rendering (the note's string/fret, plus the fret as drawn and its font so a decoration can
 * recolor the digit); null for a notation notehead. `chord` lists every mdom note sharing this
 * note's onset so chordmates resolve. mnote stays internal. */
export interface RawNote {
	mnote: MNote;
	rect: Rect;
	/* Everything drawn for this note on its line but its stem and beam: `rect` plus the
	 * accidentals, parentheses, arpeggio, dots, and flag that hang off it. A fret's is its rect.
	 * Grace notes are their own RawNotes; Note.getInkRect unions them in. */
	ink: Rect;
	chord: MNote[];
	measureIndex: number;
	tab: { string: number; fret: number } | null;
	/* The engraved glyph for recoloring: a notehead, or a tab fret; null for a rest. */
	glyph: NoteGlyph | null;
}

/*
 * The hit-index geometry one draw pass collects, in scratch space: every notehead/fret
 * paired with its mdom note, every measure's box, every chord diagram. Read off the drawn
 * vexflow objects as each measure column completes; the pass driver shifts the rects into
 * final score space once the crop is known. One instance lives and dies with its DrawPass.
 */
export class GeometryCollector {
	private readonly rawNotes: RawNote[] = [];
	private readonly rawMeasures: RawMeasure[] = [];
	private readonly rawChordDiagrams: RawChordDiagram[] = [];

	/*
	 * Capture a tab stave's drawn fret glyphs for the hit index. Graces ride along with the
	 * real chords (same fret capture), so a tab grace colors in step with its notation
	 * grace; they stay out of the pointer tree (hit.ts skips them).
	 */
	collectTabNotes(
		measureIndex: number,
		tabStave: TabStave,
		chords: ReadonlyArray<{ note: TabNote; chord: Chord }>,
	): void {
		for (const { note, chord } of chords) {
			const x = note.getAbsoluteX();
			// The drawn fret glyphs, parallel to getPositions() (one per struck string), so a
			// decoration can replay the exact fret text vexflow drew ("<12>", "(2)", "✕")
			// in color. The tab analog of the notation path's note.noteHeads.
			const positions = note.getPositions();
			const fretEls = (
				note as unknown as {
					fretElement: {
						getText(): string;
						getFont(): string;
						getWidth(): number;
						getYShift(): number;
					}[];
				}
			).fretElement;
			for (const mnote of chord.notes) {
				const string = mnote.string;
				const fret = mnote.fret;
				if (string === null || fret === null) {
					continue;
				}
				const y = tabStave.getYForLine(string - 1);
				// Match this string's drawn fret glyph (positions carry one entry per string).
				const el = fretEls[positions.findIndex((pos) => pos.str === string)];
				const rect = new Rect(
					x - FRET_HALF_W,
					y - FRET_HALF_H,
					2 * FRET_HALF_W,
					2 * FRET_HALF_H,
				);
				this.rawNotes.push({
					mnote,
					rect,
					ink: rect,
					chord: chord.notes,
					measureIndex,
					tab: { string, fret },
					// Replay vexflow's own fret glyph for recoloring, the tab analog of the
					// notehead path: its left-anchored baseline x (drawPositions uses
					// tabX = absoluteX - width/2) and baseline y (the string line plus the
					// element's yShift, which is how TabNote vertically centers the digit).
					// Drawn left/alphabetic, a colored fret overlays the engraved one exactly.
					glyph: el
						? {
								text: el.getText(),
								font: el.getFont(),
								x: x - el.getWidth() / 2,
								y: y + el.getYShift(),
							}
						: null,
				});
			}
		}
	}

	/*
	 * Capture a notation stave's drawn noteheads for the hit index. Graces ride along: same
	 * notehead capture, so playback can sound and color them. They land in the hit index
	 * but not the pointer tree (hit.ts skips them).
	 */
	collectStaveNotes(
		measureIndex: number,
		chords: ReadonlyArray<{ note: StaveNote; chord: Chord }>,
	): void {
		for (const { note, chord } of chords) {
			// The normal notehead column's x-span (getAbsoluteX is the tick anchor, left of
			// the notehead: centering on it puts decorations off the note); the fallback
			// when a note drew no head. y per notehead comes from getYs; noteHeads is
			// indexed in the same (chord.notes) order, so heads[i] is this note's glyph.
			const headX = note.getNoteHeadBeginX();
			const headWidth = note.getNoteHeadEndX() - headX;
			const ys = note.getYs();
			const heads = note.noteHeads;
			chord.notes.forEach((mnote, i) => {
				const y = ys[i];
				if (y === undefined) {
					return;
				}
				// Capture the exact stamp vexflow drew (text + font + baseline) so a
				// decoration can replay it in color: see Decorations. Scratch space; the
				// caller shifts y by cropTop into score space alongside the rect. Read x
				// from the bounding box (this.x + xShift), not getX(): a NoteHead borrows
				// its StaveNote's tick context, so the inherited Tickable.getX() throws.
				// The baseline y is the notehead's staff y (ys[i]); noteheads carry no yShift.
				// A head only learns its x when it draws, so one that never drew (a hidden
				// print-object="no" note) has no box or glyph: its box would sit at x 0.
				const head = heads[i];
				const box = head?.isRendered() ? head.getBoundingBox() : undefined;
				const glyph =
					head && box
						? {
								text: head.getText(),
								font: head.getFont(),
								x: box.getX(),
								y,
							}
						: null;
				// The rect tracks this head's own drawn box, not the chord's normal column
				// (getNoteHeadBeginX/EndX): a head displaced for a second sits a head-width
				// off the stem, and a rect that misses it would clip its color stamp.
				// Vertically a notehead gets the standard band around its staff y, but a
				// rest is a NoteHead too, carrying a glyph of any height (a quarter rest
				// spans three staff spaces), so its rect follows the drawn box there as
				// well: a decoration clears exactly what it stamped.
				const rest = mnote.isRest && box;
				const rect = new Rect(
					box ? box.getX() : headX,
					rest ? box.getY() : y - NOTEHEAD_HALF_H,
					box ? box.getW() : headWidth,
					rest ? box.getH() : 2 * NOTEHEAD_HALF_H,
				);
				this.rawNotes.push({
					mnote,
					rect,
					ink: this.inkOf(note, i, rect),
					chord: chord.notes,
					measureIndex,
					tab: null,
					glyph,
				});
			});
		}
	}

	/*
	 * The head's rect grown over what vexflow hangs beside it: the side modifiers attached at
	 * this head's index (accidentals, parentheses, dots, left/right fingerings), the arpeggio
	 * or non-arpeggiate bracket (drawn once, at index 0, for the whole chord), and the flag.
	 * Each box repeats the placement its draw() computes (getModifierStartXY plus the
	 * xShift format assigned, negated for a left modifier) rather than reading
	 * getBoundingBox: a modifier's x is unset until it draws, which this may precede, and a
	 * grace group's box reports a bogus near-origin y (see SystemFormatter).
	 */
	private inkOf(note: StaveNote, index: number, head: Rect): Rect {
		let ink = head;
		const ys = note.getYs();
		for (const mod of note.getModifiers()) {
			const box = this.modifierInk(note, mod, index, ys);
			if (box) {
				ink = ink.union(box);
			}
		}
		const stem = note.getStem();
		if (note.shouldDrawFlag() && stem) {
			// drawFlag's placement: the glyph's baseline sits a (signed) stem height off the far
			// head. The flag itself is protected on StemmableNote.
			const { flag } = note as unknown as { flag: Element };
			const { yTop, yBottom } = note.getNoteHeadBounds();
			const height = stem.getHeight();
			const {
				actualBoundingBoxAscent: ascent,
				actualBoundingBoxDescent: descent,
			} = flag.getTextMetrics();
			const baseline =
				note.getStemDirection() === Stem.DOWN
					? yTop - height - descent
					: yBottom - height + ascent;
			ink = ink.union(
				new Rect(
					note.getStemX() - Stem.WIDTH / 2,
					baseline - ascent,
					flag.getWidth(),
					ascent + descent,
				),
			);
		}
		return ink;
	}

	private modifierInk(
		note: StaveNote,
		mod: Modifier,
		index: number,
		ys: number[],
	): Rect | null {
		const category = mod.getCategory();
		const stroke = category === Stroke.CATEGORY;
		if (
			!stroke &&
			(!INK_CATEGORIES.has(category) || mod.getIndex() !== index)
		) {
			return null;
		}
		const position = mod.getPosition();
		const left = position === Modifier.Position.LEFT;
		if (!left && position !== Modifier.Position.RIGHT) {
			return null;
		}
		const start = note.getModifierStartXY(position, mod.checkIndex(), {
			forceFlagRight: true,
		});
		const w = mod.getWidth();
		const x = start.x + mod.getXShift() - (left ? w : 0);
		if (stroke) {
			// The wiggle (or bracket) spans every head, overhanging each end by half a space,
			// and vexflow repeats the wiggle glyph until it covers that, overshooting the bottom
			// by up to one more half. An upward arrowhead sits on the top head, reaching a space
			// above it; a downward one hangs a space below the bottom head, half a space more.
			const space = note.checkStave().getSpacingBetweenLines();
			// Stroke keeps its type protected and offers no getter, so read it through a cast.
			const { type } = mod as unknown as { type: number };
			const top = Math.min(...ys) - space;
			const bottom =
				Math.max(...ys) + (ARROW_BELOW.has(type) ? 1.5 : 1) * space;
			return new Rect(x, top, w, bottom - top);
		}
		const metrics = mod.getTextMetrics();
		const top = start.y + mod.getYShift() - metrics.actualBoundingBoxAscent;
		const h =
			metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
		return new Rect(x, top, w, h);
	}

	addMeasure(measure: RawMeasure): void {
		this.rawMeasures.push(measure);
	}

	addChordDiagram(diagram: RawChordDiagram): void {
		this.rawChordDiagrams.push(diagram);
	}

	/*
	 * Grow each measure box up to the topmost above-stave text decoration (chord symbol,
	 * words) in its system, so the measure's bounding box (and the playback cursor and
	 * auto-scroll that ride on it) cover those extras instead of clipping them. Chord
	 * diagrams are excluded (they don't feed the decoration ceiling), so the cursor bar
	 * stops at the stave, not the fret box. Called once, at the end of the pass.
	 */
	applyDecorationTops(tops: {
		decorationTopOf(system: number): number | undefined;
	}): void {
		for (const [i, measure] of this.rawMeasures.entries()) {
			const top = tops.decorationTopOf(measure.systemIndex);
			const { rect } = measure;
			if (top !== undefined && top < rect.y) {
				this.rawMeasures[i] = {
					...measure,
					rect: new Rect(rect.x, top, rect.w, rect.bottom - top),
				};
			}
		}
	}

	notes(): RawNote[] {
		return this.rawNotes;
	}

	measures(): RawMeasure[] {
		return this.rawMeasures;
	}

	chordDiagrams(): RawChordDiagram[] {
		return this.rawChordDiagrams;
	}
}

/* The side modifiers one notehead owns (attached at its index) that count toward its ink. A
 * Stroke (arpeggio) is drawn once for the whole chord, so it counts for every head. Grace
 * groups and annotations (lyrics, fingerings above/below) stay out: graces are notes of their
 * own, and text above or below the stave is not on the note's line. */
const INK_CATEGORIES = new Set([
	'Accidental',
	'Dot',
	'Parenthesis',
	'FretHandFinger',
]);

/* The strokes whose arrowhead hangs below the bottom head (Stroke.draw). */
const ARROW_BELOW = new Set<number>([
	Stroke.Type.BRUSH_UP,
	Stroke.Type.ROLL_UP,
	Stroke.Type.RASGUEADO_UP,
]);

export interface RawMeasure {
	rect: Rect;
	index: number;
	/* The MusicXML measure number (a string; handles pickups, "X1" etc.). */
	number: string;
	/* The system (line) this measure column was laid out on. */
	systemIndex: number;
}

/* A chord diagram (fret box) the draw pass placed, in score space. The rect spans the whole
 * drawn extent (title included). */
export interface RawChordDiagram {
	rect: Rect;
	/* The <harmony> that produced this diagram. */
	harmonySource: Harmony;
	measureIndex: number;
	frame: ChordFrame;
	/* The harmony text drawn as the diagram's title, or null when it drew untitled. */
	title: string | null;
}
