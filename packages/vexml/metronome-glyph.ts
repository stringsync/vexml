import { Element, type RenderContext } from 'vexflow/core';
import type { DocumentPosition } from './score-reader';

/*
 * The <metronome-note> form of a metronome mark: a note GROUP either side of a relation, e.g.
 * "two beamed eighths = a quarter-eighth triplet": the swing marking. vexflow's StaveTempo only
 * draws the <beat-unit> forms ("note = bpm", "note = note"), so this group is laid out and
 * stroked here instead: SMuFL note glyphs at StaveTempo's own size, with beams, augmentation
 * dots, and tuplet brackets drawn in.
 *
 * Layout runs once in the constructor and drawing just replays it, so the box a caller reserves
 * for collisions and the ink that actually lands come from the same numbers.
 */
export class MetronomeGlyph {
	/** Total advance width, and how far the ink reaches above/below the baseline. */
	readonly width: number;
	readonly ascent: number;
	readonly descent: number;

	private readonly placed: Placed[] = [];
	private readonly bars: Bar[] = [];
	private readonly curves: Tie[] = [];
	private readonly arrows: Arrow[] = [];

	/* Laying out and measuring both use these, so the shared cursor state stays in the
	 * constructor and the group/beam/bracket helpers below mutate it. */
	private x = 0;
	private top: number;
	private readonly noteAscent: number;
	private readonly beamThickness: number;
	private readonly stemWidth: number;
	private readonly glyph = new Element('StaveTempo.glyph');
	private readonly text = new Element('StaveTempo');

	constructor(modulation: TempoModulation) {
		// One note's metrics, which every note here borrows: the met* glyphs are within a couple
		// of pixels of each other at this size, so the stems reach the same height and the beams
		// between them come out level. A stemless whole note just reserves more air than it needs.
		this.glyph.setText(BEAMED_GLYPH);
		this.noteAscent = this.glyph.getTextMetrics().actualBoundingBoxAscent;
		this.descent = this.glyph.getTextMetrics().actualBoundingBoxDescent;
		this.beamThickness = this.noteAscent * BEAM_THICKNESS;
		this.stemWidth = this.noteAscent * STEM_WIDTH;
		this.top = -this.noteAscent;

		if (modulation.arrows) {
			this.putArrow(-1);
			this.x += GAP;
		}
		if (modulation.parenthesis) {
			this.putText('(');
			this.x += GAP;
		}
		this.putGroup(modulation.left);
		this.x += GAP;
		this.putText('=');
		this.x += GAP;
		if (modulation.rate !== null) {
			this.putText(modulation.rate);
		} else {
			this.putGroup(modulation.right);
		}
		if (modulation.parenthesis) {
			this.x += GAP;
			this.putText(')');
		}
		if (modulation.arrows) {
			this.x += GAP;
			this.putArrow(1);
		}

		this.width = this.x;
		this.ascent = -this.top;
	}

	private putGlyph(content: string, y: number): void {
		this.glyph.setText(content);
		this.placed.push({
			kind: 'glyph',
			text: content,
			x: this.x,
			y,
			size: null,
		});
		this.x += this.glyph.getWidth();
	}

	private putText(content: string): void {
		this.text.setText(content);
		this.placed.push({
			kind: 'text',
			text: content,
			x: this.x,
			y: 0,
			size: null,
		});
		this.x += this.text.getWidth();
	}

	/* One note group: the glyphs left to right, then the beams and tuplet brackets spanning them.
	 * Those need every note's x, so they are stroked after the walk rather than during it. */
	private putGroup(notes: ModulationNote[]): void {
		const spans: Span[] = [];
		for (const [i, note] of notes.entries()) {
			if (i > 0) {
				// A tie needs room to arc between the noteheads it joins.
				this.x += notes[i - 1]?.tiesToNext ? TIE_GAP : GAP;
			}
			const left = this.x;
			this.putGlyph(
				note.beamed ? BEAMED_GLYPH : (NOTE_GLYPHS[note.type] ?? BEAMED_GLYPH),
				0,
			);
			for (let dot = 0; dot < note.dots; dot++) {
				this.x += GAP;
				// StaveTempo nudges its augmentation dots 2px down; match it so a dotted unit in
				// the bpm mark and one here sit at the same height.
				this.putGlyph(DOT_GLYPH, 2);
			}
			spans.push({ left, right: this.x });
		}
		this.putBeams(notes, spans);
		this.putBrackets(notes, spans);
		this.putTies(notes, spans);
	}

	/* An arrow pointing `direction` (-1 left, 1 right), centered on the notehead line. */
	private putArrow(direction: -1 | 1): void {
		this.arrows.push({
			x: this.x,
			y: -this.noteAscent * ARROW_RISE,
			direction,
		});
		this.x += this.noteAscent * ARROW_LENGTH;
	}

	/*
	 * A tie from each note marked as tied to the one after it, bowing below the noteheads
	 * (these notes are stem-up). It runs from the first note's notehead to the next one's, so
	 * an augmentation dot between them sits above the arc rather than being struck through.
	 */
	private putTies(notes: ModulationNote[], spans: Span[]): void {
		for (const [i, note] of notes.entries()) {
			const from = spans[i];
			const to = spans[i + 1];
			if (!note.tiesToNext || !from || !to) {
				continue;
			}
			this.curves.push({
				x1: from.left + this.noteAscent * TIE_INSET,
				x2: to.left + this.noteAscent * TIE_INSET,
				y: this.descent * 0.8,
				bow: this.noteAscent * TIE_BOW,
			});
		}
	}

	private putBeams(notes: ModulationNote[], spans: Span[]): void {
		for (const [i, note] of notes.entries()) {
			const from = spans[i];
			const to = spans[i + 1];
			if (!from || !to) {
				continue;
			}
			// An up-stem sits at the right edge of its notehead, so a beam runs from the near side
			// of this note's stem to the far side of the next one's. Extra beams stack downward
			// from the stem tops, which is why they never change the mark's height.
			for (let level = 0; level < note.beamsToNext; level++) {
				this.bars.push({
					x: from.right - this.stemWidth,
					y: -this.noteAscent + level * this.beamThickness * (1 + BEAM_SPACING),
					width: to.right - from.right + this.stemWidth,
					height: this.beamThickness,
				});
			}
		}
	}

	/*
	 * A tuplet bracket over each start..stop span: a horizontal line broken in the middle for the
	 * ratio's number, with a leg dropping toward the notes at either end. An unclosed span runs
	 * to the end of the group rather than being dropped.
	 */
	private putBrackets(notes: ModulationNote[], spans: Span[]): void {
		for (const [i, note] of notes.entries()) {
			if (note.tuplet?.type !== 'start') {
				continue;
			}
			const close = notes.findIndex(
				(other, j) => j > i && other.tuplet?.type === 'stop',
			);
			const from = spans[i];
			const to = (close === -1 ? spans.at(-1) : spans[close]) ?? from;
			if (!from || !to) {
				continue;
			}

			const label = String(note.tuplet.actual);
			const size = this.noteAscent * BRACKET_NUMBER_SIZE;
			const sized = new Element('StaveTempo');
			sized.setFontSize(size);
			sized.setText(label);
			const labelWidth = sized.getWidth();

			const y = -this.noteAscent * (1 + BRACKET_GAP);
			const leg = this.noteAscent * BRACKET_LEG;
			const center = (from.left + to.right) / 2;
			const breakFrom = center - labelWidth / 2 - GAP;
			const breakTo = center + labelWidth / 2 + GAP;
			this.bars.push(
				// The two halves of the horizontal line, the number sitting in the break.
				{
					x: from.left,
					y,
					width: breakFrom - from.left,
					height: this.beamThickness,
				},
				{
					x: breakTo,
					y,
					width: to.right - breakTo,
					height: this.beamThickness,
				},
				// Legs, dropping from the line back toward the noteheads.
				{ x: from.left, y, width: this.beamThickness, height: leg },
				{
					x: to.right - this.beamThickness,
					y,
					width: this.beamThickness,
					height: leg,
				},
			);
			// The number's baseline sits on the bracket line, so its ink is what reaches highest.
			this.placed.push({
				kind: 'text',
				text: label,
				x: center - labelWidth / 2,
				y: y + this.beamThickness,
				size,
			});
			this.top = Math.min(
				this.top,
				y - sized.getTextMetrics().actualBoundingBoxAscent,
			);
		}
	}

	/** Draw the group with its left edge at `x` and its noteheads centered on `baseline`. */
	draw(context: RenderContext, x: number, baseline: number): void {
		for (const item of this.placed) {
			// A fresh element per run: sizing one in place would leak the tuplet number's smaller
			// font onto whatever is drawn after it.
			const el = new Element(
				item.kind === 'glyph' ? 'StaveTempo.glyph' : 'StaveTempo',
			);
			if (item.size !== null) {
				el.setFontSize(item.size);
			}
			el.setText(item.text);
			el.renderText(context, x + item.x, baseline + item.y);
		}
		for (const bar of this.bars) {
			context.fillRect(x + bar.x, baseline + bar.y, bar.width, bar.height);
		}
		for (const tie of this.curves) {
			// A crescent: out along one bow and back along a shallower one, so the tie swells in
			// the middle and thins to points at the noteheads.
			const mid = x + (tie.x1 + tie.x2) / 2;
			const y = baseline + tie.y;
			context.beginPath();
			context.moveTo(x + tie.x1, y);
			context.quadraticCurveTo(mid, y + tie.bow * 2, x + tie.x2, y);
			context.quadraticCurveTo(
				mid,
				y + tie.bow * 2 - this.beamThickness * 2,
				x + tie.x1,
				y,
			);
			context.closePath();
			context.fill();
		}
		for (const arrow of this.arrows) {
			this.drawArrow(context, x + arrow.x, baseline + arrow.y, arrow.direction);
		}
	}

	/* A shaft with a filled triangular head at the end `direction` points to. */
	private drawArrow(
		context: RenderContext,
		x: number,
		y: number,
		direction: -1 | 1,
	): void {
		const length = this.noteAscent * ARROW_LENGTH;
		const head = this.noteAscent * ARROW_HEAD;
		const tip = direction === 1 ? x + length : x;
		const back = tip - direction * head;
		context.fillRect(
			direction === 1 ? x : back,
			y - this.beamThickness / 2,
			length - head,
			this.beamThickness,
		);
		context.beginPath();
		context.moveTo(tip, y);
		context.lineTo(back, y - head / 2);
		context.lineTo(back, y + head / 2);
		context.closePath();
		context.fill();
	}
}

/*
 * SMuFL metronome note glyphs by MusicXML <metronome-type>, mirroring vexflow's own
 * StaveTempo.durationToCode so both forms of mark draw the same noteheads at the same size.
 * vexflow's `Glyphs` enum isn't re-exported, hence the literal codepoints: metNoteDoubleWhole,
 * metNoteWhole, then the stem-up metNoteHalfUp through metNote128thUp.
 */
const NOTE_GLYPHS: Record<string, string> = {
	breve: '\uECA0',
	whole: '\uECA2',
	half: '\uECA3',
	quarter: '\uECA5',
	eighth: '\uECA7',
	'16th': '\uECA9',
	'32nd': '\uECAB',
	'64th': '\uECAD',
	'128th': '\uECAF',
};

/*
 * metNoteQuarterUp: a stemmed black notehead with NO flag, which is exactly what a beamed note
 * looks like. A note carrying a <metronome-beam> draws with this whatever its own type and gets
 * its beams stroked in: an eighth's own flag would otherwise print inside the beam. It doubles
 * as the fallback for an unrecognized <metronome-type>.
 */
const BEAMED_GLYPH = '';

/** metAugmentationDot: the dot StaveTempo trails a dotted unit with. */
const DOT_GLYPH = '';

/** Gap between adjacent pieces, matching the 3px StaveTempo advances each of its own pieces by. */
const GAP = 3;

/** Beam thickness and the stem width a beam has to reach back over, as fractions of a note's ascent. */
const BEAM_THICKNESS = 0.09;
const STEM_WIDTH = 0.03;

/** Air between stacked beams (16ths and finer), as a fraction of the beam thickness. */
const BEAM_SPACING = 0.75;

/** Tuplet bracket: clearance above the stems, leg length, and number size, all off the ascent. */
const BRACKET_GAP = 0.16;
const BRACKET_LEG = 0.14;
const BRACKET_NUMBER_SIZE = 0.36;

/** Arrow length, head size, and rise above the notehead line, as fractions of a note's ascent. */
const ARROW_LENGTH = 1;
const ARROW_HEAD = 0.4;
const ARROW_RISE = 0.25;

/** Tie: how far in from a note's left edge it starts, and how deep it bows. */
const TIE_INSET = 0.1;
const TIE_BOW = 0.22;
const TIE_GAP = 9;

/** A `<metronome-tuplet>` marker: the ratio's `actual-notes`, and which end of the span this is. */
export type ModulationTuplet = { actual: number; type: 'start' | 'stop' };

/** One `<metronome-note>` of a metric modulation. */
export type ModulationNote = {
	/** `<metronome-type>`: 'eighth', 'quarter', … */
	type: string;
	/** `<metronome-dot/>` count. */
	dots: number;
	/** Drawn beamed rather than flagged: the note carries at least one `<metronome-beam>`. */
	beamed: boolean;
	/** How many beams run from this note to the next: its 'begin'/'continue' markers. */
	beamsToNext: number;
	/** Tied to the note after it: a `<metronome-tied type="start">`, or a `<beat-unit-tied>`. */
	tiesToNext: boolean;
	tuplet: ModulationTuplet | null;
};

/**
 * A `<metronome>` written in the note form: two note groups either side of a
 * `<metronome-relation>`. This is the shape a swing marking takes, and the beat-unit form (see
 * `TempoMark`) cannot express it: a beat unit is one note, never a beamed pair or a triplet.
 */
export type TempoModulation = {
	left: ModulationNote[];
	right: ModulationNote[];
	/** Text for the right side instead of notes: the bpm, when a `<beat-unit>` mark is drawn here. */
	rate: string | null;
	parenthesis: boolean;
	/** `<metronome-arrows>`: an arrow either side of the mark. */
	arrows: boolean;
	/** `justify`: which part of the mark sits at its anchor. */
	justify: 'left' | 'center' | 'right' | null;
	/** The `<metronome>`'s document position (see ScoreReader.positionOf). */
	position?: DocumentPosition | null;
};

/**
 * A glyph or text run, placed relative to the group's left edge and baseline. `size` overrides
 * the element's default point size (the tuplet number, which is smaller than the "=").
 */
type Placed = {
	kind: 'glyph' | 'text';
	text: string;
	x: number;
	y: number;
	size: number | null;
};

/** A tie arc from x1 to x2 at y, its control point `bow` below the chord. */
type Tie = { x1: number; x2: number; y: number; bow: number };

/** An arrow's left edge and centerline, and the way it points. */
type Arrow = { x: number; y: number; direction: -1 | 1 };

/** An axis-aligned bar. Beams and all three sides of a tuplet bracket are drawn as these. */
type Bar = { x: number; y: number; width: number; height: number };

/** The x range one note occupies: its left edge, and the right edge of its last augmentation dot. */
type Span = { left: number; right: number };
