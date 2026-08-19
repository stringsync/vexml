import type { Chord, Harmony, Note as MNote } from '@stringsync/mdom';
import type { StaveNote, TabNote, TabStave } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import type { ChordFrame } from './chord-diagram-glyph';
import { FRET_HALF_H, FRET_HALF_W, NOTEHEAD_HALF_H } from './constants';

/* A note's engraved glyph, captured so a decoration can re-stamp it in color on an overlay: the
 * SMuFL text, the exact CSS font vexflow drew it with, and its baseline position in score space.
 * Replaying vexflow's own fillText reproduces the notehead precisely — hollow notes stay hollow. */
export interface NoteGlyph {
	readonly text: string;
	readonly font: string;
	readonly x: number;
	readonly y: number;
}

/* A notehead or fret the draw pass laid out, in score space. `tab` is set when this is a tab
 * fret rendering (the note's string/fret, plus the fret as drawn and its font so a decoration can
 * recolor the digit); null for a notation notehead. `chord` lists every mdom note sharing this
 * note's onset so chordmates resolve. mnote stays internal. */
export interface RawNote {
	mnote: MNote;
	rect: Rect;
	chord: MNote[];
	measureIndex: number;
	tab: { string: number; fret: number } | null;
	/* The engraved glyph for recoloring — a notehead, or a tab fret; null for a rest. */
	glyph: NoteGlyph | null;
}

export interface RawMeasure {
	rect: Rect;
	index: number;
	/* The MusicXML measure number (a string — handles pickups, "X1" etc.). */
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
			// decoration can replay the exact fret text vexflow drew — "<12>", "(2)", "✕" —
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
				this.rawNotes.push({
					mnote,
					rect: new Rect(
						x - FRET_HALF_W,
						y - FRET_HALF_H,
						2 * FRET_HALF_W,
						2 * FRET_HALF_H,
					),
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
			// The notehead glyph's true x-span (getAbsoluteX is the tick anchor, left of
			// the notehead — centering on it puts decorations off the note). y per
			// notehead comes from getYs; noteHeads is indexed in the same (chord.notes)
			// order, so heads[i] is this note's glyph.
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
				// decoration can replay it in color — see Decorations. Scratch space; the
				// caller shifts y by cropTop into score space alongside the rect. Read x
				// from the bounding box (this.x + xShift), not getX(): a NoteHead borrows
				// its StaveNote's tick context, so the inherited Tickable.getX() throws.
				// The baseline y is the notehead's staff y (ys[i]); noteheads carry no yShift.
				const head = heads[i];
				const glyph = head
					? {
							text: head.getText(),
							font: head.getFont(),
							x: head.getBoundingBox().getX(),
							y,
						}
					: null;
				this.rawNotes.push({
					mnote,
					rect: new Rect(
						headX,
						y - NOTEHEAD_HALF_H,
						headWidth,
						2 * NOTEHEAD_HALF_H,
					),
					chord: chord.notes,
					measureIndex,
					tab: null,
					glyph,
				});
			});
		}
	}

	addMeasure(measure: RawMeasure): void {
		this.rawMeasures.push(measure);
	}

	addChordDiagram(diagram: RawChordDiagram): void {
		this.rawChordDiagrams.push(diagram);
	}

	/*
	 * Grow each measure box up to the topmost above-stave text decoration (chord symbol,
	 * words) in its system, so the measure's bounding box — and the playback cursor and
	 * auto-scroll that ride on it — cover those extras instead of clipping them. Chord
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
