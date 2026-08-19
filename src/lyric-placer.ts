import type { RenderContext, StaveNote } from 'vexflow';
import type { CollisionResolver } from './collision-resolver';
import { LYRIC_FONT_SIZE, LYRIC_LINE_HEIGHT } from './constants';
import { Rect } from './geometry';
import { isLyricMark, type LyricMark } from './lyric-mark/lyric-mark';
import type { NoteTranslator } from './note-translator';

export interface LyricPlacerOptions {
	/* Per lyric row (keyed `<systemIndex>:<staveRow>`), how far to drop it so it clears the
	 * notes above it — measured on the previous pass and reserved on this one; empty on the
	 * first pass. */
	lyricDrops?: Map<string, number>;
}

/*
 * Hangs each stave row's lyric verses on one shared baseline and remembers how far below
 * the staff every row's verse had to drop, so the next pass can pin the whole row to its
 * worst drop. One instance lives and dies with its DrawPass.
 */
export class LyricPlacer {
	// Measured on the previous pass and reserved on this one; empty on the first pass.
	private readonly lyricDrops: Map<string, number>;
	// Verse baseline feedback, keyed by `<systemIndex>:<staveRow>`: how far below the bottom
	// staff line this pass hung the row's lyrics, and whether the row's measure columns
	// disagreed (see recordDrop).
	private observedLyricDrops = new Map<string, number>();
	private lyricsStepped = false;

	constructor(
		private readonly translator: NoteTranslator,
		private readonly context: RenderContext,
		private readonly collisionResolver: CollisionResolver,
		private readonly notationColor: string,
		opts: LyricPlacerOptions = {},
	) {
		this.lyricDrops = opts.lyricDrops ?? new Map();
	}

	/** Key for one stave row of one system, the scope a verse's baseline is shared over. */
	private rowKey(system: number, row: number): string {
		return `${system}:${row}`;
	}

	/*
	 * Remember how far this measure column pushed its verse below the staff, and whether any
	 * other column of the same row wanted a different drop. The max is what the next pass
	 * pins every column of the row to; `stepped` is what tells the driver a second pass is
	 * worth running (a row whose columns already agree redraws to the same pixels).
	 */
	recordDrop(system: number, row: number, drop: number): void {
		const key = this.rowKey(system, row);
		const seen = this.observedLyricDrops.get(key);
		if (seen !== undefined && seen !== drop) {
			this.lyricsStepped = true;
		}
		this.observedLyricDrops.set(key, Math.max(seen ?? 0, drop));
	}

	/* The drop the previous pass reserved for this row, 0 when it reserved none. */
	carriedDrop(system: number, row: number): number {
		return this.lyricDrops.get(this.rowKey(system, row)) ?? 0;
	}

	/*
	 * Put every lyric syllable among `notes` (one stave's real notes) onto the shared
	 * `baseline` measured for their row, one line per verse. Left to vexflow each syllable
	 * would hang off its own note (see LyricAnnotation), so the verse would rise and fall
	 * with the melody instead of reading as a line of text. Called after format and before
	 * draw, so the syllables land under where the notes actually ended up.
	 *
	 * Each pinned syllable is also registered as a collision obstacle in band `row`, so
	 * anything the draw pass places under the stave later (a placement="below" directive, a
	 * dynamics marking) drops clear of the verse instead of printing through it. vexflow
	 * draws lyrics itself, so this is the only point where their boxes are known.
	 */
	pin(notes: StaveNote[], row: number, baseline: number): void {
		const lyricNotes = notes
			.map((note) => ({ note, lyrics: this.lyricsOf(note) }))
			.filter(({ lyrics }) => lyrics.length > 0);
		if (lyricNotes.length === 0) {
			return;
		}
		for (const { note, lyrics } of lyricNotes) {
			for (const lyric of lyrics) {
				const y = baseline + lyric.verseIndex * LYRIC_LINE_HEIGHT;
				lyric.setBaselineY(y);
				// Pin the ink a syllable already draws in. vexflow runs a note's modifiers
				// inside its notehead's own style, so an uncolored lyric under a note the
				// score colored would otherwise come out in the notehead's color.
				lyric.setStyle({ fillStyle: this.notationColor });
				// LyricAnnotation.draw centers the syllable on the notehead and draws up from
				// the baseline, so its box is one text height tall ending at that baseline.
				const w = lyric.getWidth();
				this.collisionResolver.add({
					rect: new Rect(
						note.getAbsoluteX() - w / 2,
						y - LYRIC_FONT_SIZE,
						w,
						LYRIC_FONT_SIZE,
					),
					kind: 'annotation',
					band: row,
				});
			}
		}
		this.drawMelismas(notes, row, baseline);
	}

	/*
	 * Melisma extenders: a `<lyric><extend/>` draws a horizontal line on the verse's own row
	 * from just past its syllable to the last note the syllable is held over — the note before
	 * the next syllable in that same verse, or the stave's last note when none follows. Drawn
	 * here rather than as a modifier because the line spans notes, and pin is the point
	 * where every syllable's row and every note's x are final.
	 *
	 * ponytail: the line stops at the end of the stave, so a melisma that runs past a barline
	 * or a system break draws only its first segment. Make it a real spanner (buildTies'
	 * pairing in spanner-builder.ts is the model) if a fixture needs the continuation.
	 */
	private drawMelismas(
		notes: StaveNote[],
		row: number,
		baseline: number,
	): void {
		for (const [i, note] of notes.entries()) {
			for (const lyric of this.lyricsOf(note)) {
				if (!lyric.extend) {
					continue;
				}
				const next = notes.findIndex(
					(n, j) =>
						j > i &&
						this.lyricsOf(n).some((l) => l.verseIndex === lyric.verseIndex),
				);
				const last = notes[(next === -1 ? notes.length : next) - 1];
				if (!last || last === note) {
					continue;
				}
				const y = baseline + lyric.verseIndex * LYRIC_LINE_HEIGHT;
				const x1 = note.getAbsoluteX() + lyric.getWidth() / 2;
				const x2 = last.getAbsoluteX() + this.translator.noteheadHalfWidth();
				if (x2 <= x1) {
					continue;
				}
				this.context.save();
				this.context.setStrokeStyle(this.notationColor);
				this.context.setLineWidth(1);
				// Half-pixel offset so a 1px line lands on one device row instead of straddling
				// two and coming out gray next to the black staff lines.
				const crisp = Math.round(y) + 0.5;
				this.context.beginPath();
				this.context.moveTo(x1, crisp);
				this.context.lineTo(x2, crisp);
				this.context.stroke();
				this.context.restore();
				this.collisionResolver.add({
					rect: new Rect(x1, y - 1, x2 - x1, 2),
					kind: 'annotation',
					band: row,
				});
			}
		}
	}

	/* The lyric syllables hanging off a note, in verse order. */
	private lyricsOf(note: StaveNote): LyricMark[] {
		return note.getModifiers().filter(isLyricMark);
	}

	/* Every row's drop (keyed `<systemIndex>:<staveRow>`), for the pass driver to re-pin with. */
	observedDrops(): Map<string, number> {
		return this.observedLyricDrops;
	}

	/* Whether any row's measure columns disagreed on their drop — the signal that a redraw
	 * with the observed drops would land the verses on different pixels. */
	stepped(): boolean {
		return this.lyricsStepped;
	}
}
