import type {
	Chord,
	Note,
	Part,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import {
	Barline,
	Bend,
	Formatter,
	GraceNoteGroup,
	Modifier,
	type RenderContext,
	Renderer,
	Stave,
	StaveConnector,
	type StaveNote,
	StaveTempo,
	Stem,
	type TabNote,
	TabStave,
	Vibrato,
	type Voice,
} from 'vexflow';
import { ChordDiagram, type ChordSpec } from './chord-diagram';
import type { Config } from './config';
import {
	BRACKET_X_SHIFT,
	CHORD_DIAGRAM_GAP,
	CHORD_DIAGRAM_HEIGHT,
	CHORD_DIAGRAM_WIDTH,
	HARMONY_FONT_SIZE,
	HARMONY_NOTE_CLEARANCE,
	HARMONY_Y_OFFSET,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	LEDGER_HEADROOM,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
	PEDAL_BOTTOM_MARGIN,
	PEDAL_BOTTOM_TEXT_LINE,
	TEMPO_NOTE_CLEARANCE,
	TEMPO_SCALE,
	TIE_APEX_RISE,
	WORDS_FONT_SIZE,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from './constants';
import type { MeasureNumbering, ScoreLayout } from './layout';
import {
	endBeatOf,
	findModifier,
	getNoteheadHalfWidth,
	harmoniesOf,
	meterBeats,
	type PedalMark,
	pedalsOf,
	softVoice,
	staffVoices,
	type TempoMark,
	tempoOf,
	vexflowClef,
	vexflowTabTickables,
	vexflowVoiceTickables,
	wordsOf,
} from './notes';
import {
	buildBeams,
	buildHammerPulls,
	buildPedals,
	buildSlides,
	buildSlurs,
	buildTies,
	buildTuplets,
	groupBeams,
} from './spanners';

/*
 * MusicXML <time> -> vexflow time-signature spec: 'C' (common), 'C|' (cut), or
 * "beats/beat-type". null when there's nothing drawable. Doubles as the equality
 * key for detecting a mid-piece meter change.
 */
function timeSignatureSpec(time: Time | null): string | null {
	if (time?.symbol === 'common') {
		return 'C';
	}
	if (time?.symbol === 'cut') {
		return 'C|';
	}
	if (time?.beats && time?.beatType) {
		return `${time.beats}/${time.beatType}`;
	}
	return null;
}

/*
 * True when the part stacks a TAB stave with at least one non-TAB (notation) stave —
 * the guitar notation+tab pairing, which is bracketed rather than braced by convention.
 */
function pairsTabWithNotation(part: Part): boolean {
	const measure = part.measures[0];
	if (!measure) {
		return false;
	}
	const signs: string[] = [];
	for (let staff = 1; staff <= part.staveCount; staff++) {
		const sign = measure.getClef(String(staff))?.sign;
		if (sign) {
			signs.push(sign);
		}
	}
	return signs.includes('TAB') && signs.some((sign) => sign !== 'TAB');
}

/*
 * True when a notation+tab pair is split across separate single-stave parts (a
 * guitar's notation in one part, its TAB in another) rather than stacked in one
 * two-stave part. Such a system is bracketed by convention, the cross-part analog
 * of pairsTabWithNotation. Only meaningful for multi-part systems — a single
 * notation+tab part already brackets itself via partSymbol.
 */
function partsPairTabWithNotation(parts: Part[]): boolean {
	if (parts.length < 2) {
		return false;
	}
	const signs: string[] = [];
	for (const part of parts) {
		const measure = part.measures[0];
		if (!measure) {
			continue;
		}
		for (let staff = 1; staff <= Math.max(part.staveCount, 1); staff++) {
			const sign = measure.getClef(String(staff))?.sign;
			if (sign) {
				signs.push(sign);
			}
		}
	}
	return signs.includes('TAB') && signs.some((sign) => sign !== 'TAB');
}

/*
 * The stave connector that joins a multi-staff part's own staves. An explicit
 * <part-symbol> in any measure's attributes wins: bracket, none (no connector), or
 * brace (the MusicXML default; line/square fall back to it). With none declared, a
 * guitar notation+tab pair brackets by convention and everything else (piano grand
 * staves, …) braces.
 */
function partSymbol(part: Part): 'brace' | 'bracket' | null {
	for (const measure of part.measures) {
		const symbol = measure.child('attributes')?.child('part-symbol')?.text;
		if (symbol) {
			if (symbol === 'none') {
				return null;
			}
			return symbol === 'bracket' ? 'bracket' : 'brace';
		}
	}
	return pairsTabWithNotation(part) ? 'bracket' : 'brace';
}

// One stave's notes, built but not yet formatted or drawn. A part's staves are
// formatted together (see formatAndDrawSystem) so notes at the same tick line up
// vertically across staves, so the build (voice/spanner construction) is split from
// the format+draw step.
type PendingStave = {
	stave: Stave;
	isTab: boolean;
	vexVoices: Voice[];
	beams: ReturnType<typeof buildBeams>;
	tuplets: ReturnType<typeof buildTuplets>;
	// Real notes only (no gap-filling ghosts), for the bottom-bound calc.
	staveNotes: StaveNote[];
};

/*
 * Build a notation staff's notes into vexflow voices. Each mdom voice becomes a
 * vexflow voice; multiple voices are aligned together and stem apart. Beams and
 * tuplets are per-voice (positional) and built here; ties and slurs can span
 * measures, so the caller resolves them once over the whole score (this only
 * records each chord's StaveNote in the shared `byLead` map).
 */
function buildNotes(
	stave: Stave,
	voices: ScoreVoice[],
	clef: string,
	softmaxFactor: number,
	byLead: Map<Note, StaveNote>,
	meterFloor: number,
): PendingStave {
	// Floor the run-out beat at the meter so an underfull measure pads trailing
	// ghosts instead of jamming its last note against the end barline.
	const endBeat = Math.max(endBeatOf(voices), meterFloor);
	const staveNotes: StaveNote[] = [];
	const vexVoices = voices.map((voice) => {
		const tickables = vexflowVoiceTickables(
			voice.chords,
			clef,
			endBeat,
			(lead, note) => {
				byLead.set(lead, note);
				staveNotes.push(note);
			},
		);
		return softVoice(tickables, softmaxFactor);
	});

	// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be
	// built before formatting.
	const beams = buildBeams(
		voices.flatMap((v) => groupBeams(v.chords)),
		byLead,
	);
	const tuplets = voices.flatMap((v) => buildTuplets(v.chords, byLead));

	return { stave, isTab: false, vexVoices, beams, tuplets, staveNotes };
}

/*
 * The highest y a single note reaches: its top notehead, and — when it has a stem —
 * the stem tip, which a beam extends up to its beam line. Excludes modifiers on
 * purpose (see formatAndDrawSystem). Falls back to the notehead bound if the stem
 * extents aren't available (e.g. a stemless whole note).
 */
function noteTop(note: StaveNote): number {
	let top = note.getNoteHeadBounds().yTop;
	if (note.getStem()) {
		const { topY, baseY } = note.getStemExtents();
		top = Math.min(top, topY, baseY);
	}
	// Clear articulations sitting above the notehead too (e.g. a staccato dot on a
	// stem-down note). They're drawn before the harmony/words/tempo pass, so their
	// bounding box is final; the notehead and stem alone miss them, which would let a
	// chord symbol land on the dot. Only above-side marks raise the top — below-side
	// ones (stem-up notes) don't.
	for (const mod of note.getModifiers()) {
		if (
			mod.getCategory() === 'Articulation' &&
			mod.getPosition() === Modifier.Position.ABOVE
		) {
			top = Math.min(top, mod.getBoundingBox().getY());
		}
	}
	return top;
}

/*
 * Format a system's staves together and draw their notes. A note's absolute x is its
 * (shared) tick-context x plus its own stave's note-start x, so two things must hold
 * for same-tick notes to line up across staves: a single Formatter shares the tick
 * contexts, and every stave starts its note area at the same x. Staves are equalized
 * to the widest note start (a treble clef is wider than the "TAB" glyph) — otherwise
 * the columns shear apart even when the ticks match. Returns the topmost/lowest y any
 * content reaches so the page can grow to fit high notes and deep ledger lines.
 */
function formatAndDrawSystem(
	context: RenderContext,
	pending: PendingStave[],
	softmaxFactor: number,
): { top: number; bottom: number } {
	if (pending.length === 0) {
		return { top: Infinity, bottom: 0 };
	}

	const startX = Math.max(...pending.map((p) => p.stave.getNoteStartX()));
	let noteEndX = 0;
	for (const p of pending) {
		p.stave.setNoteStartX(startX);
		noteEndX = p.stave.getNoteEndX();
		for (const vexVoice of p.vexVoices) {
			vexVoice.setStave(p.stave);
		}
	}

	// joinVoices per stave (voices on one stave share accidental/stem columns), then
	// format every voice at once to share tick contexts across staves. The note area
	// was sized to a global px-per-tick, so spacing stays consistent across measures.
	const formatter = new Formatter({ softmaxFactor });
	for (const p of pending) {
		formatter.joinVoices(p.vexVoices);
	}
	const allVoices = pending.flatMap((p) => p.vexVoices);
	const justifyWidth = noteEndX - startX - Stave.defaultPadding;
	formatter.format(allVoices, justifyWidth, { context });

	let bottom = 0;
	// Track how high content rises above the staves from each note's noteheads and its
	// (beam-extended) stem tip. Deliberately NOT note.getBoundingBox().getY(): that
	// unions in attached modifiers, and a GraceNoteGroup's box reports a bogus near-
	// origin y that would wrongly claim the note reaches the top of the page. Beams/
	// tuplets sit a hair higher than the stem; the PAGE_MARGIN_TOP buffer the crop keeps
	// above this top covers them (their own getBoundingBox is unreliable too).
	let top = Infinity;
	// A notation grace group's width, keyed by its main note's (shared) tick context, so a
	// tab grace group at the same tick can match its notation counterpart by identity.
	const notationGraceWidths = new Map<unknown, number>();
	for (const p of pending) {
		if (p.isTab) {
			continue;
		}
		for (const vexVoice of p.vexVoices) {
			for (const note of vexVoice.getTickables() as StaveNote[]) {
				const group = graceGroupOf(note);
				if (group) {
					notationGraceWidths.set(note.getTickContext(), group.getWidth());
				}
			}
		}
	}
	for (const p of pending) {
		if (p.isTab) {
			// setStave before stretching so each note's getAbsoluteX() is in true stave
			// coordinates — the stretch helpers compare it against stave.getNoteEndX().
			const tabStave = p.stave as TabStave;
			// Center each fret (and its cleared staff-line gap) under the notation
			// notehead, which is left-anchored at the shared start x: shift the tab note
			// area right by half a notehead. Safe post-format — the stave is already drawn
			// (line ~527) and the formatter never reads getAbsoluteX, so only the notes,
			// their gaps, and note-anchored modifiers (bends/annotations) move.
			tabStave.setNoteStartX(startX + getNoteheadHalfWidth());
			for (const vexVoice of p.vexVoices) {
				for (const note of vexVoice.getTickables()) {
					note.setStave(tabStave);
				}
			}
			stretchVibratos(tabStave, p.vexVoices);
			stretchBends(tabStave, p.vexVoices);
			alignTabGraces(p.vexVoices, notationGraceWidths);
		}
		for (const vexVoice of p.vexVoices) {
			vexVoice.draw(context, p.stave);
		}
		for (const beam of p.beams) {
			beam.setContext(context).draw();
		}
		for (const tuplet of p.tuplets) {
			tuplet.setContext(context).draw();
		}
		for (const note of p.staveNotes) {
			const box = note.getBoundingBox();
			bottom = Math.max(bottom, box.getY() + box.getH());
			top = Math.min(top, noteTop(note));
		}
	}
	return { top, bottom };
}

/*
 * Draw a metronome mark ("<note> = bpm") above the stave, anchored just right of the
 * clef/key/time (StaveTempo's own placement, over the first note). It normally sits
 * one text line above the staff; if the first note reaches up into that band (a high
 * note with ledger lines), lift the mark with a negative y-shift so its bottom clears
 * the notehead — the layout reserves the matching top headroom. Drawn after the notes
 * are formatted so firstNote's extents are real. Uses noteTop, not the bounding box: an
 * attached grace-note group makes the box report a bogus near-origin y.
 */
function drawTempo(
	context: RenderContext,
	stave: Stave,
	tempo: TempoMark,
	firstNote: StaveNote | undefined,
): void {
	const baseY = stave.getYForTopText(1);
	let shiftY = 0;
	if (firstNote) {
		const clearY = noteTop(firstNote) - TEMPO_NOTE_CLEARANCE;
		if (clearY < baseY) {
			shiftY = clearY - baseY;
		}
	}
	// vexflow's StaveTempo.draw reads stave.getModifierXShift(position), which uses the
	// position enum as an index into the stave's modifier array. ABOVE (the default, 3)
	// indexes modifiers[3], which is undefined — and throws — on a system-start stave that
	// re-states a clef but no time signature (begin barline + clef + end barline = 3
	// modifiers). CENTER (0) points at the always-present begin barline instead, yielding
	// the same start-of-notes x offset without the out-of-bounds read.
	const position = 0;
	const shiftX = stave.getModifierXShift(position);
	// StaveTempo's font sizes come from vexflow Metrics, which isn't reachable to override,
	// so shrink the whole mark with a context scale. Scaling multiplies every coordinate by
	// TEMPO_SCALE, which would also drag the mark up and left; pre-divide the x/y inputs so it
	// lands back on its original anchor. Internally StaveTempo draws at (this.x + shiftX + 10,
	// baseY + this.yShift); solving s·(passed) = target gives the compensated inputs below.
	const targetX = stave.getX() + shiftX + 10;
	context.save();
	context.scale(TEMPO_SCALE, TEMPO_SCALE);
	new StaveTempo(
		{ duration: tempo.duration, bpm: tempo.bpm },
		targetX / TEMPO_SCALE - shiftX - 10,
		(baseY + shiftY) / TEMPO_SCALE - baseY,
	)
		.setStave(stave)
		.setPosition(position)
		.setContext(context)
		.draw();
	context.restore();
}

// Accidental glyphs in a chord symbol; pulled tight against their root letter.
const HARMONY_ACCIDENTALS = new Set(['♯', '♭', '♮']);
const HARMONY_ACCIDENTAL_KERN = 2.5;
const HARMONY_ACCIDENTAL_FONT_SIZE = HARMONY_FONT_SIZE - 3;

/*
 * Draw a chord symbol (from a <harmony>) above its note's stave, left-anchored at
 * the note's x — the laid-out position of the note the harmony applies to. Returns
 * the y the text reaches up to so the caller can grow the page crop to keep a margin
 * above it (drawTempo relies on reserved layout headroom instead; harmony feeds the
 * crop directly so no extra top margin is needed). Drawn after the notes are
 * formatted so getAbsoluteX is real.
 */
function drawHarmony(
	context: RenderContext,
	staveNote: StaveNote,
	text: string,
	font: string,
	hasTie: boolean,
): number {
	const stave = staveNote.getStave();
	if (!stave) {
		return Infinity;
	}
	// Sit a fixed gap above the top staff line, but lift higher when the note rises into
	// that band (a high note or its ledger lines) so the symbol clears the notehead. Uses
	// noteTop, not the bounding box: an attached grace-note group makes the box report a
	// bogus near-origin y, which would fling the symbol to the top of the page and defeat
	// the top crop (leaving a huge blank margin above the first system).
	const baseY = stave.getYForLine(0) - HARMONY_Y_OFFSET;
	let noteClearY = noteTop(staveNote) - HARMONY_NOTE_CLEARANCE;
	// A stem-down note's tie bows up over the noteheads (vexflow bows a single note's, and
	// a chord's upper, tie opposite the stem), peaking past what noteTop sees. The tie is a
	// separate spanner drawn later — there's no glyph to measure here — so reconstruct its
	// apex from the top notehead center (a constant rise, independent of tie length) and
	// clear that too, otherwise the symbol lands on the arc. Gate on the apex itself rising
	// above where the symbol would otherwise sit (baseY): only then does the tie actually
	// pass through the text. A low note's tie — including a long tie whose far-right apex
	// stays below the baseline — sits clear of the symbol, so leave it at baseY.
	if (hasTie && staveNote.getStemDirection() === Stem.DOWN) {
		const tieApexY = Math.min(...staveNote.getYs()) - TIE_APEX_RISE;
		if (tieApexY < baseY) {
			noteClearY = Math.min(noteClearY, tieApexY - HARMONY_NOTE_CLEARANCE);
		}
	}
	const y = Math.min(baseY, noteClearY);
	context.save();
	context.setFont(font, HARMONY_FONT_SIZE);
	context.setFillStyle('#000000');
	// The ♯/♭/♮ glyphs carry wide side-bearings in the text font, so a single fillText
	// of "B♭" reads as "B ♭". Draw char by char and pull the accidental in on both sides
	// so it sits tight against its root letter.
	let x = staveNote.getAbsoluteX();
	for (const ch of text) {
		const accidental = HARMONY_ACCIDENTALS.has(ch);
		if (accidental) {
			x -= HARMONY_ACCIDENTAL_KERN;
			context.setFont(font, HARMONY_ACCIDENTAL_FONT_SIZE);
		}
		context.fillText(ch, x, y);
		x += context.measureText(ch).width;
		if (accidental) {
			x -= HARMONY_ACCIDENTAL_KERN;
			context.setFont(font, HARMONY_FONT_SIZE);
		}
	}
	context.restore();
	return y - HARMONY_FONT_SIZE;
}

/*
 * Draw a words direction (e.g. "ritardando") above the stave in italics, left-anchored at
 * the first note's x — where the directive applies. Sits a fixed gap above the top staff
 * line, but lifts higher when the first note rises into that band (a high note or its ledger
 * lines) so the text clears the notehead. Returns the y the text reaches up to so the caller
 * can grow the page crop above it (like drawHarmony). Drawn after the notes are formatted so
 * getAbsoluteX is real. Uses noteTop, not the bounding box, to clear the note: an attached
 * grace-note group makes the box report a bogus near-origin y.
 */
function drawWords(
	context: RenderContext,
	stave: Stave,
	text: string,
	firstNote: StaveNote | undefined,
	font: string,
): number {
	const baseY = stave.getYForLine(0) - WORDS_Y_OFFSET;
	const noteClearY = firstNote
		? noteTop(firstNote) - WORDS_NOTE_CLEARANCE
		: baseY;
	const y = Math.min(baseY, noteClearY);
	const x = firstNote ? firstNote.getAbsoluteX() : stave.getNoteStartX();
	context.save();
	context.setFont(font, WORDS_FONT_SIZE, 'normal', 'italic');
	context.setFillStyle('#000000');
	context.fillText(text, x, y);
	context.restore();
	return y - WORDS_FONT_SIZE;
}

/*
 * Build a tablature staff's notes into vexflow voices of TabNotes (fret numbers on
 * their strings). Tab notes carry no clef/key, no ghost-note gap filling, and no
 * beams — the roadmap cases are single-voice fretted lines — so this is a slimmer
 * sibling of buildNotes. The bend/vibrato stretching and drawing happen in
 * formatAndDrawSystem, after the part's staves are formatted together. Hammer-ons/
 * pull-offs span measures, so the caller resolves them once over the whole score
 * (this only records each chord's TabNote in the shared `byTabLead` map).
 */
function buildTabNotes(
	stave: TabStave,
	voices: ScoreVoice[],
	softmaxFactor: number,
	byTabLead: Map<Note, TabNote>,
): PendingStave {
	const vexVoices = voices.map((voice) =>
		softVoice(
			vexflowTabTickables(voice.chords, (lead, tabNote) =>
				byTabLead.set(lead, tabNote),
			),
			softmaxFactor,
		),
	);
	// Build (but discard) the tab tuplets: their construction rescales the notes'
	// ticks (Tuplet.attach), which the part's shared formatter needs so a triplet's
	// tab frets stay aligned under their notation notes. The bracket/number is drawn
	// on the notation staff, so these aren't kept for drawing.
	for (const voice of voices) {
		buildTuplets(voice.chords, byTabLead);
	}
	return {
		stave,
		isTab: true,
		vexVoices,
		beams: [],
		tuplets: [],
		staveNotes: [],
	};
}

/*
 * VexFlow draws a bend arrow at a fixed ~8px width. A guitar bend reads as sliding
 * into the next note, so stretch each so its arrow reaches the next note — or the
 * bar's end if it's the last note (same span as stretchVibratos). The arrow draws
 * from getAbsoluteX() + width + 2 + 3 (TabNote RIGHT modifier x, +3 in Bend.draw),
 * mirrored here (the modifier's own x isn't positioned until draw). getAbsoluteX()
 * is in stave coordinates only because formatAndDrawSystem setStave's the notes first — else
 * it's stave-relative and the last note's span to getNoteEndX overshoots off the page.
 * Bend.draw uses each phrase leg's drawWidth, which is protected — hence the cast. A
 * bend-and-release (UP+DOWN) peaks at the midpoint and returns, so split across legs.
 */
function stretchBends(stave: TabStave, voices: Voice[]): void {
	for (const voice of voices) {
		const tickables = voice.getTickables() as TabNote[];
		tickables.forEach((note, i) => {
			const bend = findModifier<Bend>(note, Bend.CATEGORY);
			if (!bend) {
				return;
			}
			const startX = note.getAbsoluteX() + note.getWidth() + 5;
			const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
			const width = Math.max(0, endX - startX);
			const { phrase } = bend as unknown as {
				phrase: { drawWidth?: number }[];
			};
			const [up, down] = phrase;
			if (!up) {
				return;
			}
			if (down) {
				up.drawWidth = width / 2;
				down.drawWidth = 0;
			} else {
				up.drawWidth = width;
			}
		});
	}
}

/*
 * VexFlow's Vibrato draws a fixed 20px wavy line trailing the fret. A real vibrato
 * sustains for the note's full sounding length, so stretch each to span up to the
 * next note — or the bar's end if it's the last note. Widths depend on the formatted
 * x positions, so this runs after formatToStave: set each Vibrato's width from the
 * fret's right edge to the next note's x (or the stave's note-end x). The Vibrato
 * draws from getAbsoluteX() + width + 2 (TabNote.getModifierStartXY for RIGHT), mirrored
 * here. Like stretchBends, this relies on formatAndDrawSystem having setStave'd the notes so
 * getAbsoluteX() is in stave coordinates and the last note's span clamps to the barline.
 */
function stretchVibratos(stave: TabStave, voices: Voice[]): void {
	for (const voice of voices) {
		const tickables = voice.getTickables() as TabNote[];
		tickables.forEach((note, i) => {
			const vibrato = findModifier<Vibrato>(note, Vibrato.CATEGORY);
			if (!vibrato) {
				return;
			}
			const startX = note.getAbsoluteX() + note.getWidth() + 2;
			const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
			vibrato.setVibratoWidth(Math.max(0, endX - startX));
		});
	}
}

/*
 * The GraceNoteGroup attached to a note (the small notes drawn just left of it), if any.
 */
function graceGroupOf(note: {
	getModifiers(): { getCategory(): string }[];
}): GraceNoteGroup | undefined {
	return findModifier<GraceNoteGroup>(note, GraceNoteGroup.CATEGORY);
}

// vexflow's GraceNoteGroup.format spaces a stave grace group GRACE_GROUP_SPACING_STAVE px
// off its note; tab groups get 0. The value is private to vexflow, mirrored here.
const GRACE_GROUP_SPACING_STAVE = 4;

/*
 * A tab grace group reserves no accidental space, so its frets would land left of the
 * notation grace noteheads, which a flat/sharp pushes right within their own group. Shift
 * each tab grace group right so its frets sit under the notehead: by the notation grace
 * group's own left reservation (its width + GRACE_GROUP_SPACING_STAVE) minus the tab
 * group's (note.getMetrics().modLeftPx). Match the notation group by the shared tick
 * context — every stave formatted together shares one per tick. Deliberately NOT the tick
 * context's modLeftPx: that's the max across the stave, so a main note with its OWN
 * accidental (a chord) inflates it and overshoots the grace shift. With no notation
 * counterpart (tab-only score) nothing moves. Runs before draw, which reads
 * spacingFromNextModifier when positioning the grace notes.
 */
function alignTabGraces(
	voices: Voice[],
	notationGraceWidths: Map<unknown, number>,
): void {
	for (const voice of voices) {
		for (const note of voice.getTickables() as TabNote[]) {
			const group = graceGroupOf(note);
			if (!group) {
				continue;
			}
			const notationWidth = notationGraceWidths.get(note.getTickContext());
			if (notationWidth === undefined) {
				continue;
			}
			const own = note.getMetrics().modLeftPx;
			group.setSpacingFromNextModifier(
				group.getSpacingFromNextModifier() +
					Math.max(0, notationWidth + GRACE_GROUP_SPACING_STAVE - own),
			);
		}
	}
}

/*
 * The "TAB" glyph is sized and centered for a 6-line staff. For a shorter tab staff
 * (e.g. a 4-string bass) shrink and re-center it to fit. Reaches into vexflow's clef
 * modifier directly — there's no public API for this.
 */
function resizeTabClef(stave: TabStave, tabLines: number): void {
	if (tabLines === 6) {
		return;
	}
	const [tabClef] = stave.getModifiers(undefined, 'Clef') as unknown as Array<{
		line: number;
		fontInfo: { size: number };
	}>;
	if (tabClef) {
		tabClef.fontInfo.size *= (tabLines - 1) / 5;
		tabClef.line = (tabLines - 1) / 2;
	}
}

/*
 * Whether measure at 0-based `index` (system-start or not) shows its number under
 * the given mode. 'every-N' numbers every Nth measure plus every system start.
 */
function showsMeasureNumber(
	mode: MeasureNumbering,
	index: number,
	isSystemStart: boolean,
): boolean {
	switch (mode) {
		case 'none':
			return false;
		case 'system':
			return isSystemStart;
		case 'every':
			return true;
		case 'every-2':
			return isSystemStart || index % 2 === 0;
		case 'every-3':
			return isSystemStart || index % 3 === 0;
	}
}

/*
 * Draw the whole score onto the element: one SVG stave per part-staff per measure,
 * placed at the boxes computed by computeLayout, with clefs/keys/time signatures,
 * notes, and the brace/barline connectors that group parts into systems.
 */
export function drawScore(
	canvas: HTMLCanvasElement,
	parts: Part[],
	layout: ScoreLayout,
	config: Config,
): void {
	const {
		measureCount,
		boxes,
		staveOffsets,
		totalStaves,
		softmaxFactor,
		systemGap,
		width,
		floorHeight,
		labelIndent,
	} = layout;
	const { measureNumbering, showTabHammerPullText, showTabSlideText } = config;

	// Canvas is immediate-mode: resizing a canvas clears its bitmap, so the final
	// page height must be known before drawing — but it's only discovered while
	// drawing (systems stack downward, deep ledger lines extend further). So draw
	// once onto an oversized offscreen canvas, then blit the used region into the
	// real canvas cropped to content. SVG could grow after drawing; canvas can't.
	const systemCount =
		boxes.reduce((n, b) => (b ? Math.max(n, b.systemIndex + 1) : n), 0) || 1;
	const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
	// The first system starts this far down so notes/beams that rise above its top
	// staff have room instead of being clipped off the canvas top. The unused slack is
	// cropped back out in the blit (mirrors how LEDGER_HEADROOM gives the bottom slack).
	const topSlack = LEDGER_HEADROOM;
	const scratchHeight = layout.top + topSlack + systemCount * perSystem;

	const scratch = document.createElement('canvas');
	const renderer = new Renderer(scratch, Renderer.Backends.CANVAS);
	const context = renderer.getContext();
	renderer.resize(width, scratchHeight);

	// Part labels use the text font set on the container by loadFonts() (the only
	// reader of --vexml-font-text). Falls back to Arial if unset (e.g. SSR/no fonts).
	// Read from the real (in-DOM) canvas — the offscreen scratch has no CSS vars.
	const labelFont =
		getComputedStyle(canvas).getPropertyValue('--vexml-font-text').trim() ||
		'Arial';

	// Draw every measure once. `topOverflow` maps a systemIndex to extra space to reserve
	// above that system so its notes (which rise above its own top stave) clear the system
	// before it — measured on a first pass and applied on a second (see the driver below).
	// Returns the page extents drawn plus the overflow this pass observed per system.
	const runPass = (
		topOverflow: Map<number, number>,
	): {
		pageTop: number;
		pageBottom: number;
		observedOverflow: Map<number, number>;
	} => {
		// One note map for the whole score: ties and slurs can span a barline, so their
		// two endpoints may live in different measures. Notes are drawn measure by
		// measure (recording into this map); the spanners are resolved once at the end.
		const byLead = new Map<Note, StaveNote>();
		const allChords: Chord[] = [];
		// Pedal directions are spanners too (a start..stop pair), collected per measure
		// and resolved over the whole score alongside ties and slurs.
		const allPedals: PedalMark[] = [];

		// The same arrangement for tablature staves: hammer-ons/pull-offs also span
		// barlines, so TAB notes record into their own map and resolve at the end.
		const byTabLead = new Map<Note, TabNote>();
		const allTabChords: Chord[] = [];

		// Systems stack top-to-bottom. Each is placed below the previous system's lowest
		// drawn content (notes + staff lines), so deep ledger lines push the next system
		// down instead of colliding with it — fixed spacing can't, since note range is
		// unbounded. The symmetric hazard — the next system's notes rising above its own
		// top stave into that gap — is covered by topOverflow, measured on a prior pass.
		let pageBottom = 0;
		let pageTop = Infinity;
		let systemTopY = layout.top + topSlack;
		let systemContentBottom = systemTopY;
		let currentSystem = -1;
		// The right edge (+ gap) of the last chord diagram drawn in the current system, so a
		// diagram near a barline can be pushed clear of the one before it across the measure
		// boundary. Reset when a new system starts (x coordinates restart at the left).
		let prevDiagramRight = -Infinity;
		// Per system: the stave-top y it was placed at, and the highest (smallest) y any of
		// its content reached. Their difference is how far the system overflows above its
		// top stave — reserved above it on a redraw so it can't clash with the system above.
		const systemTopByIndex = new Map<number, number>();
		const systemHighestTop = new Map<number, number>();
		for (let m = 0; m < measureCount; m++) {
			const box = boxes[m];
			if (!box) {
				continue;
			}
			const { x: measureX, width: measureWidth, systemIndex } = box;
			const { isSystemStart } = box;
			const isLastMeasure = m === measureCount - 1;
			// An explicit right <barline> with <bar-style>light-light</bar-style> draws a thin
			// double line at this measure's end instead of the default single divider (or, on
			// the final measure, the thin-thick end). Read from the first part — a light-light
			// boundary applies across the system.
			const isLightLight =
				parts[0]?.measures[m]?.barlines.find((b) => b.location === 'right')
					?.barStyle === 'light-light';
			const showMeasureNumber = showsMeasureNumber(
				measureNumbering,
				m,
				isSystemStart,
			);
			// Number is printed once per measure, above the system's top stave only.
			let measureNumbered = false;
			if (systemIndex !== currentSystem) {
				if (currentSystem >= 0) {
					// Gap below the previous system, plus room reserved for this system's own
					// upward overflow (high notes/ledger lines) so they clear it, not collide.
					systemTopY =
						systemContentBottom +
						systemGap +
						(topOverflow.get(systemIndex) ?? 0);
				}
				currentSystem = systemIndex;
				systemContentBottom = systemTopY;
				systemTopByIndex.set(systemIndex, systemTopY);
				prevDiagramRight = -Infinity;
			}
			const systemY = systemTopY;
			let staveRow = 0;
			let systemTop: Stave | undefined;
			let systemBottom: Stave | undefined;
			// Every part's staves are formatted together as one column so notes at the same
			// tick line up vertically across the whole system — not just within a part.
			// Standard engraving aligns all instruments on the beat, and a notation+tab pair
			// split into separate MusicXML parts must align the same as a single two-stave
			// part. Built per part below, then formatted and drawn once after the part loop.
			const systemPending: PendingStave[] = [];
			const tempoTasks: Array<{
				stave: Stave;
				tempo: TempoMark;
				firstNote: StaveNote | undefined;
			}> = [];
			// Chord symbols, drawn after the system is formatted so each sits at its
			// note's laid-out x.
			const harmonyTasks: Array<{
				staveNote: StaveNote;
				text: string;
				hasTie: boolean;
				frame: ChordSpec | null;
			}> = [];
			// Words directions (e.g. "ritardando"), each drawn above its part's top stave at
			// the first note's laid-out x.
			const wordsTasks: Array<{
				stave: Stave;
				text: string;
				firstNote: StaveNote | undefined;
			}> = [];

			for (const part of parts) {
				const staveCount = Math.max(part.staveCount, 1);
				const measure = part.measures[m];
				if (!measure) {
					staveRow += staveCount;
					continue;
				}

				let partTop: Stave | undefined;
				let partBottom: Stave | undefined;
				// A part's staves are built here, then formatted and drawn together below so
				// notes at the same tick align vertically across staves (notation over tab).
				const pendingStaves: PendingStave[] = [];

				for (let s = 0; s < staveCount; s++) {
					const staffNumber = String(s + 1);
					const clef = measure.getClef(staffNumber);
					const staveY = systemY + (staveOffsets[staveRow] ?? 0);

					// A TAB clef draws on a TabStave whose line count matches the
					// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
					const isTab = clef?.sign === 'TAB';
					const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
					const stave = isTab
						? new TabStave(measureX, staveY, measureWidth, {
								numLines: tabLines,
							})
						: new Stave(measureX, staveY, measureWidth);
					// Only draw the end barline. Each measure's end barline is the same line
					// as the next measure's left edge, so internal measures still get a divider;
					// only the first measure of a system loses its left barline (intended). The
					// final measure of the piece closes with a thin-thick end barline.
					// When the system has multiple staves, the per-measure stave connector
					// already draws this line across the staves, so the per-stave end barline
					// is suppressed to avoid doubling it.
					// Exception: a lone TAB stave has no system connector to close its left
					// edge, so its system-start measure draws an explicit begin barline.
					stave.setBegBarType(
						isTab && totalStaves === 1 && isSystemStart
							? Barline.type.SINGLE
							: Barline.type.NONE,
					);
					stave.setEndBarType(
						totalStaves > 1
							? Barline.type.NONE
							: isLightLight
								? Barline.type.DOUBLE
								: isLastMeasure
									? Barline.type.END
									: Barline.type.SINGLE,
					);

					// The previous measure's effective signatures (carried forward), used to
					// spot a mid-system change. getKey/getTime return what's in effect at the
					// measure start, so M3 of a piece that changed key at M2 reads the same
					// key as M2 — no spurious redraw.
					const prevMeasure = part.measures[m - 1];
					const key = measure.getKey(staffNumber);
					const keyChanged =
						(key?.rootNote ?? null) !==
						(prevMeasure?.getKey(staffNumber)?.rootNote ?? null);

					// Clef and key print at every system start (re-stated on each new line).
					// A mid-system key change is also redrawn where it happens (clef and time
					// are not repeated for it).
					if (isSystemStart) {
						if (isTab) {
							const tabStave = stave as TabStave;
							tabStave.addTabGlyph();
							resizeTabClef(tabStave, tabLines);
						} else if (clef) {
							stave.addClef(vexflowClef(clef.sign, clef.line));
						}
						// Tab staves carry no key signature.
						if (key?.rootNote && !isTab) {
							stave.addKeySignature(key.rootNote);
						}
					} else if (key?.rootNote && keyChanged && !isTab) {
						stave.addKeySignature(key.rootNote);
					}

					// Unlike clef and key, the time signature is not re-stated at every
					// system start — only at the piece start and wherever the meter changes
					// (a change that lands on a system break still redraws here).
					const timeSpec = timeSignatureSpec(measure.getTime(staffNumber));
					const prevTimeSpec = timeSignatureSpec(
						prevMeasure?.getTime(staffNumber) ?? null,
					);
					if (timeSpec && !isTab && (m === 0 || timeSpec !== prevTimeSpec)) {
						stave.addTimeSignature(timeSpec);
					}

					// A bracket (drawn below) has a top curl that sits where vexflow's
					// setMeasure centers the measure number, so the number gets occluded — true
					// both for a multi-stave part's own bracket and for the system bracket of a
					// notation+tab pair split across parts. Only for a bracket do we draw the
					// number ourselves, left-aligned just right of the barline and lifted above
					// the curl; the curly brace doesn't reach that high, so it keeps vexflow's
					// placement. The number prints once (measureNumbered), on the top stave.
					const numberOccluded =
						isSystemStart &&
						((staveCount > 1 && partSymbol(part) === 'bracket') ||
							partsPairTabWithNotation(parts));
					if (showMeasureNumber && !measureNumbered && !numberOccluded) {
						stave.setMeasure(Number(measure.number));
						measureNumbered = true;
					}

					stave.setContext(context).draw();

					if (showMeasureNumber && !measureNumbered && numberOccluded) {
						context.save();
						context.setFont(stave.getFont());
						context.setFillStyle('#000000');
						context.fillText(
							measure.number,
							stave.getX() + 4,
							stave.getYForTopText(0) - 14,
						);
						context.restore();
						measureNumbered = true;
					}
					const staveBottom = stave.getBottomY();
					pageBottom = Math.max(pageBottom, staveBottom);
					systemContentBottom = Math.max(systemContentBottom, staveBottom);

					// Build this staff's notes; they're formatted and drawn together with the
					// rest of the part's staves below. A TAB stave builds fretted TabNotes;
					// everything else uses the notation path. An empty voice (no chords) would
					// crash the formatter, so it's filtered.
					const voices = staffVoices(measure.voices, staffNumber);
					if (isTab && voices.length > 0) {
						pendingStaves.push(
							buildTabNotes(
								stave as TabStave,
								voices,
								softmaxFactor,
								byTabLead,
							),
						);
						for (const voice of voices) {
							allTabChords.push(...voice.chords);
						}
					} else if (voices.length > 0) {
						const clefName = clef
							? vexflowClef(clef.sign, clef.line)
							: 'treble';
						pendingStaves.push(
							buildNotes(
								stave,
								voices,
								clefName,
								softmaxFactor,
								byLead,
								meterBeats(measure.getTime(staffNumber)),
							),
						);
						for (const voice of voices) {
							allChords.push(...voice.chords);
						}
					}

					partTop ??= stave;
					partBottom = stave;
					systemTop ??= stave;
					systemBottom = stave;
					staveRow++;
				}

				// Defer formatting to one pass over the whole system (below) so notes align
				// across parts, not just within this part.
				systemPending.push(...pendingStaves);

				// Chord symbols from this measure's <harmony> elements, each bound to the
				// lead note it sits above. Resolved via byLead (the notation staff's notes);
				// a harmony over a tab-only note isn't drawn.
				for (const { lead, text, frame } of harmoniesOf(measure)) {
					const staveNote = byLead.get(lead);
					if (staveNote) {
						harmonyTasks.push({
							staveNote,
							text,
							hasTie: lead.ties.length > 0,
							frame,
						});
					}
				}

				// A metronome mark (from a <direction><metronome>) prints on this part's top
				// staff wherever it appears — the piece start or a mid-piece tempo change.
				// Drawn after the system is formatted so it can clear a high first note.
				const tempo = tempoOf(measure);
				const topStave = pendingStaves[0];
				if (tempo && topStave) {
					tempoTasks.push({
						stave: topStave.stave,
						tempo,
						firstNote: topStave.staveNotes[0],
					});
				}

				// Words directions (e.g. "ritardando") print on this part's top staff, like
				// the metronome mark. Drawn after the system is formatted so the first note's
				// x is real.
				if (topStave) {
					for (const text of wordsOf(measure)) {
						wordsTasks.push({
							stave: topStave.stave,
							text,
							firstNote: topStave.staveNotes[0],
						});
					}
				}

				// Pedal markers, resolved into PedalMarkings over the whole score (a pedal
				// can span barlines) after every note is placed — see below the measure loop.
				allPedals.push(...pedalsOf(measure));

				// A part's own staves are joined at each system start by the symbol named in
				// <part-symbol> (brace by default; bracket for guitar notation+tab pairs).
				// 'none' suppresses the connector entirely.
				const symbol = partSymbol(part);
				if (
					partTop &&
					partBottom &&
					staveCount > 1 &&
					isSystemStart &&
					symbol
				) {
					// Match the cross-part path: a bracket's x comes entirely from its top
					// stave, so nudge it 4px left to sit just outside the system line with a
					// small gap, then restore. A brace keeps its own placement.
					if (symbol === 'bracket') {
						partTop.setX(measureX - BRACKET_X_SHIFT);
					}
					new StaveConnector(partTop, partBottom)
						.setType(symbol)
						.setContext(context)
						.draw();
					partTop.setX(measureX);
				}

				// Print the instrument name in the first system's reserved left indent,
				// right-aligned just before the stave and vertically centered on the part's
				// staves.
				if (
					labelIndent > 0 &&
					part.label &&
					systemIndex === 0 &&
					isSystemStart &&
					partTop &&
					partBottom
				) {
					context.save();
					context.setFont(labelFont, LABEL_FONT_SIZE);
					const tw = context.measureText(part.label).width;
					// Center on the staff lines themselves: top line of the part's first stave
					// to bottom line of its last, so a single stave centers on its middle line
					// and a multi-stave part centers on the group. +1.5 lands the cap-height
					// visual center on cy (a plain baseline at cy sits ~2.5px low).
					const cy = (partTop.getYForLine(0) + partBottom.getBottomLineY()) / 2;
					// Right-align every label to a fixed gap before the stave, so all parts'
					// names end at the same x (the gap clears the brace on multi-stave parts).
					context.fillText(part.label, measureX - LABEL_GAP - tw, cy + 1.5);
					context.restore();
				}
			}

			// Format and draw every part's staves together so same-tick notes line up
			// vertically across the whole system (notation over its own tab, and across
			// separate parts that share a beat).
			const noteExtent = formatAndDrawSystem(
				context,
				systemPending,
				softmaxFactor,
			);
			pageBottom = Math.max(pageBottom, noteExtent.bottom);
			systemContentBottom = Math.max(systemContentBottom, noteExtent.bottom);
			pageTop = Math.min(pageTop, noteExtent.top);
			if (noteExtent.top < Infinity) {
				systemHighestTop.set(
					systemIndex,
					Math.min(
						systemHighestTop.get(systemIndex) ?? Infinity,
						noteExtent.top,
					),
				);
			}
			for (const t of tempoTasks) {
				drawTempo(context, t.stave, t.tempo, t.firstNote);
			}
			// Diagrams sit at their lead note's x; two on notes either side of a barline can
			// be close enough to overlap (especially at a narrow width). Push each box's left
			// edge past the previous diagram's right edge + a gap (tracked across measures in
			// prevDiagramRight) so crowded diagrams separate instead of stacking.
			for (const h of harmonyTasks) {
				// A <harmony> with a <frame> draws as a fret box (chord name as its title)
				// above the stave; one without draws as the plain chord-symbol text.
				const stave = h.frame ? h.staveNote.getStave() : null;
				if (h.frame && stave) {
					const top =
						stave.getYForLine(0) - CHORD_DIAGRAM_GAP - CHORD_DIAGRAM_HEIGHT;
					// Size to the frame: one column per string, enough fret rows to hold the
					// deepest dot/barre (min 4 so a sparse chord still looks like a fretboard).
					const frets = [
						...h.frame.chord.map(([, f]) => (typeof f === 'number' ? f : 0)),
						...(h.frame.barres ?? []).map((b) => b.fret),
					];
					const x = Math.max(h.staveNote.getAbsoluteX(), prevDiagramRight);
					prevDiagramRight = x + CHORD_DIAGRAM_WIDTH + CHORD_DIAGRAM_GAP;
					const diagram = new ChordDiagram(x, top, {
						width: CHORD_DIAGRAM_WIDTH,
						height: CHORD_DIAGRAM_HEIGHT,
						numStrings: h.frame.chord.length,
						numFrets: Math.max(4, ...frets),
						showTuning: false,
						fontFamily: labelFont,
					});
					diagram.draw(context, { ...h.frame, title: h.text || undefined });
					pageTop = Math.min(pageTop, diagram.top);
					// The diagram rises above the stave, so it also counts toward this system's
					// upward overflow — otherwise no systemSpacing is reserved for it and a
					// diagram on a stacked system collides with the system above.
					systemHighestTop.set(
						systemIndex,
						Math.min(
							systemHighestTop.get(systemIndex) ?? Infinity,
							diagram.top,
						),
					);
				} else {
					pageTop = Math.min(
						pageTop,
						drawHarmony(context, h.staveNote, h.text, labelFont, h.hasTie),
					);
				}
			}
			for (const w of wordsTasks) {
				pageTop = Math.min(
					pageTop,
					drawWords(context, w.stave, w.text, w.firstNote, labelFont),
				);
			}

			// Join the whole system across all parts with a shared left line at the
			// system start, and a closing line at the system end.
			if (systemTop && systemBottom && totalStaves > 1) {
				if (isSystemStart) {
					// Every multi-stave system gets a plain left line closing the staves' left
					// edge. A notation+tab pair split across separate parts also gets a bracket
					// (the cross-part analog of the single-part bracket), drawn just outside it.
					new StaveConnector(systemTop, systemBottom)
						.setType('singleLeft')
						.setContext(context)
						.draw();
					if (partsPairTabWithNotation(parts)) {
						// The bracket's x comes entirely from its top stave; nudge that 4px left
						// so the bracket sits just outside the system line with a small gap, then
						// restore.
						systemTop.setX(measureX - BRACKET_X_SHIFT);
						new StaveConnector(systemTop, systemBottom)
							.setType('bracket')
							.setContext(context)
							.draw();
						systemTop.setX(measureX);
					}
				}
				// Every measure's end line gets a connector joining the part's staves, so
				// internal barlines are tied across staves and not just drawn per-stave.
				// The piece's final measure gets a bold thin-thick connector to match its
				// end barline; all other measure ends get a plain single line.
				new StaveConnector(systemTop, systemBottom)
					.setType(
						isLightLight
							? 'thinDouble'
							: isLastMeasure
								? 'boldDoubleRight'
								: 'singleRight',
					)
					.setContext(context)
					.draw();
			}
		}

		// Ties and slurs are resolved over the whole score now that every note is
		// placed, so a span can cross a barline (its endpoints sit in different
		// measures). Drawn last, on top of the notes.
		for (const tie of buildTies(allChords, byLead)) {
			tie.setContext(context).draw();
		}
		for (const slur of buildSlurs(allChords, byLead)) {
			slur.setContext(context).draw();
		}
		// Tablature hammer-ons/pull-offs and slides, likewise resolved over the whole score.
		for (const tie of buildHammerPulls(
			allTabChords,
			byTabLead,
			showTabHammerPullText,
		)) {
			tie.setContext(context).draw();
		}
		for (const slide of buildSlides(
			allTabChords,
			byTabLead,
			showTabSlideText,
		)) {
			slide.setContext(context).draw();
		}
		// Pedals draw under the stave (vexflow's getYForBottomText), below the notes, so
		// grow the bottom crop to keep their "Ped…*" text / bracket from being clipped.
		// ponytail: only the final crop is grown — a pedal on a non-last system isn't
		// reserved against the system below it; add that if a fixture stacks one there.
		for (const pedal of buildPedals(allPedals, byLead)) {
			pedal.setContext(context).draw();
		}
		for (const marker of allPedals) {
			const stave = byLead.get(marker.lead)?.getStave();
			if (stave) {
				pageBottom = Math.max(
					pageBottom,
					stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE) + PEDAL_BOTTOM_MARGIN,
				);
			}
		}

		// How far each system rose above its top stave. The first system uses the cropped top
		// slack instead, so it's excluded (it never reserves space against a system above it).
		const observedOverflow = new Map<number, number>();
		for (const [idx, topY] of systemTopByIndex) {
			const highest = systemHighestTop.get(idx);
			if (idx > 0 && highest !== undefined) {
				observedOverflow.set(idx, Math.max(0, topY - highest));
			}
		}
		return { pageTop, pageBottom, observedOverflow };
	};

	// Multi-system scores can clash where a system's notes rise above its top stave into
	// the previous system's depth. Pass one measures that per-system overflow; if any is
	// found, pass two redraws (onto the freshly cleared scratch) with the overflow reserved
	// above each system. Single-system scores never stack, so one pass suffices.
	let { pageTop, pageBottom, observedOverflow } = runPass(new Map());
	if (systemCount > 1 && [...observedOverflow.values()].some((v) => v > 0)) {
		renderer.resize(width, scratchHeight);
		({ pageTop, pageBottom } = runPass(observedOverflow));
	}

	// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
	// system aren't clipped and there's no trailing whitespace. Sizing the real
	// canvas resets it to an identity transform, so the blit copies device pixels
	// 1:1 from the scratch's top-left; the unused bottom is simply not copied.
	// Crop the top slack back out: keep PAGE_MARGIN_TOP above the highest content, but
	// never crop past the slack (so a normal score keeps its usual top margin — this is
	// then a pure shift-and-crop, leaving its output unchanged). Only scores whose first
	// system rises into the slack show extra headroom.
	const cropTop =
		pageTop === Infinity
			? topSlack
			: Math.max(0, Math.min(topSlack, pageTop - PAGE_MARGIN_TOP));
	const cssHeight =
		Math.max(floorHeight + topSlack, pageBottom + PAGE_MARGIN_BOTTOM) - cropTop;
	const dpr = scratch.width / parseFloat(scratch.style.width);
	canvas.width = scratch.width;
	canvas.height = Math.round(cssHeight * dpr);
	canvas.style.width = scratch.style.width;
	canvas.style.height = `${cssHeight}px`;
	canvas
		.getContext('2d')
		?.drawImage(
			scratch,
			0,
			Math.round(cropTop * dpr),
			scratch.width,
			canvas.height,
			0,
			0,
			scratch.width,
			canvas.height,
		);
}
