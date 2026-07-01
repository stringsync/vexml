import type {
	Chord,
	Measure,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import { MElement, Note } from '@stringsync/mdom';
import {
	Accidental,
	Annotation,
	Articulation,
	Bend,
	Dot,
	Element,
	GhostNote,
	GraceNote,
	GraceNoteGroup,
	GraceTabNote,
	Modifier,
	Parenthesis,
	StaveNote,
	Stem,
	type StemmableNote,
	Stroke,
	TabNote,
	Vibrato,
	Voice,
} from 'vexflow';
import type { ChordFrame } from './chord-diagram';
import {
	DEFAULT_TEMPO_BPM,
	EPSILON,
	GRACE_SPACING,
	TAB_FRET_SCALE,
	TAB_GRACE_SCALE,
	TAB_GRACE_SPACING,
} from './constants';

/*
 * One staff's renderable voices in a measure: voices assigned to this staff that
 * actually carry notes (an empty voice would crash the formatter). The layout
 * (measuring) and draw passes must select identically, so the predicate lives here.
 */
export function staffVoices(
	voices: ScoreVoice[],
	staffNumber: string,
): ScoreVoice[] {
	return voices.filter((v) => v.staff === staffNumber && v.chords.length > 0);
}

/*
 * MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
 * unknown combinations fall back to treble.
 */
export function vexflowClef(sign: string, line: number | null): string {
	switch (sign) {
		case 'F':
			return 'bass';
		case 'C':
			return line === 4 ? 'tenor' : 'alto';
		case 'percussion':
			return 'percussion';
		default:
			return 'treble';
	}
}

// MusicXML <type> -> vexflow duration code; rests append 'r'.
const DURATION_CODES: Record<string, string> = {
	whole: 'w',
	half: 'h',
	quarter: 'q',
	eighth: '8',
	'16th': '16',
	'32nd': '32',
	'64th': '64',
	'128th': '128',
};

/*
 * A note's vexflow duration code. An absent <type> defaults to a quarter; an
 * unrecognized type also falls back to 'q'.
 */
function durationCode(lead: Note): string {
	return DURATION_CODES[lead.type ?? 'quarter'] ?? 'q';
}

// MusicXML <accidental> glyph name -> vexflow accidental code.
const ACCIDENTAL_CODES: Record<string, string> = {
	sharp: '#',
	flat: 'b',
	natural: 'n',
	'double-sharp': '##',
	'flat-flat': 'bb',
};

/*
 * A <harmonic> in this note's <notations><technical>: drawn as a diamond notehead on a
 * notation stave (see vexflowKey) and as an angle-bracketed fret on tab (see tabPositions).
 */
function isHarmonic(note: Note): boolean {
	return !!note.child('notations')?.child('technical')?.child('harmonic');
}

/*
 * A <notehead>x</notehead>: an X-shaped notehead (a dead/muted note), drawn as a cross on a
 * notation stave (see vexflowKey) and as an "X" in place of the fret on tab (see tabPositions).
 */
function isXNotehead(note: Note): boolean {
	return note.child('notehead')?.text === 'x';
}

/*
 * A <notehead parentheses="yes">: a ghost/optional note, drawn with round brackets around the
 * notehead on a notation stave (see addParentheses) and the fret wrapped in "()" on tab (see
 * tabPositions).
 */
function isParenthesized(note: Note): boolean {
	return note.child('notehead')?.getAttribute('parentheses') === 'yes';
}

/*
 * A note's vexflow key, e.g. C#5 -> 'c/5'. A harmonic appends the '/H' notehead code so
 * vexflow draws a diamond (open for half+/whole, filled for quarter); an X notehead appends
 * '/X2' for a cross. Rests have no pitch; callers handle them.
 */
function vexflowKey(note: Note): string {
	const pitch = note.pitch;
	if (!pitch) {
		return 'b/4';
	}
	const key = `${pitch.step.toLowerCase()}/${pitch.octave}`;
	if (isHarmonic(note)) {
		return `${key}/H`;
	}
	if (isXNotehead(note)) {
		return `${key}/X2`;
	}
	return key;
}

/*
 * Augmentation dots.
 */
function addDots(staveNote: StaveNote, note: Note): void {
	for (let i = 0; i < note.dots; i++) {
		Dot.buildAndAttach([staveNote], { all: true });
	}
}

// MusicXML <articulations> name -> vexflow articulation code.
const ARTICULATION_CODES: Record<string, string> = {
	staccato: 'a.',
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'strong-accent': 'a^',
};

/*
 * Notehead-side articulations sit opposite the stem: BELOW for stem-up notes,
 * ABOVE otherwise.
 */
function articulationPosition(staveNote: StaveNote): number {
	return staveNote.getStemDirection() === Stem.UP
		? Modifier.Position.BELOW
		: Modifier.Position.ABOVE;
}

function addArticulations(staveNote: StaveNote, note: Note): void {
	// Vexflow's Articulation always defaults to ABOVE, so flip it for stem-up notes.
	// The stem direction is resolved by here (explicit via applyStem, or auto in the
	// StaveNote constructor) — except for beamed notes, whose direction the Beam only
	// settles later; reorientArticulations fixes those up after buildBeams runs.
	const position = articulationPosition(staveNote);
	for (const name of note.articulations) {
		const code = ARTICULATION_CODES[name];
		if (code) {
			staveNote.addModifier(new Articulation(code).setPosition(position));
		}
	}
}

const ARTICULATION_CODE_SET = new Set(Object.values(ARTICULATION_CODES));

/*
 * A Beam reassigns one stem direction across its group, which can flip a note's
 * direction after addArticulations already placed its marks on the old side. Re-pin
 * each notehead-side articulation to the now-final stem direction. Fermatas (a@a/a@u)
 * keep their fixed side, so leave them alone.
 */
export function reorientArticulations(staveNote: StaveNote): void {
	const position = articulationPosition(staveNote);
	for (const mod of staveNote.getModifiers()) {
		if (mod instanceof Articulation && ARTICULATION_CODE_SET.has(mod.type)) {
			mod.setPosition(position);
		}
	}
}

/*
 * A <notations><fermata>: the held-note arc-over-dot. Default placement is above
 * (vexflow "a@a"); type="inverted" mirrors it below ("a@u"). Unlike articulations,
 * the side is the fermata's type, not the stem direction.
 */
function addFermata(staveNote: StaveNote, note: Note): void {
	const fermata = note.child('notations')?.child('fermata');
	if (!fermata) {
		return;
	}
	const inverted = fermata.getAttribute('type') === 'inverted';
	const articulation = new Articulation(inverted ? 'a@u' : 'a@a');
	// Vexflow defaults every Articulation to ABOVE; the below-shaped glyph also needs the
	// BELOW position so it sits under the note instead of floating over it.
	articulation.setPosition(
		inverted ? Modifier.Position.BELOW : Modifier.Position.ABOVE,
	);
	staveNote.addModifier(articulation);
}

/*
 * A <notations><arpeggiate>: the wavy vertical line rolled down the left of a chord.
 * Drawn as a vexflow Stroke spanning every notehead (it reads the note's full y-range,
 * so attaching at index 0 covers the whole chord). MusicXML's direction is the arrow's
 * heading; vexflow names its roll types by the opposite end, so "up" (arrowhead up, at
 * the top) is ROLL_DOWN and "down" (arrowhead down, at the bottom) is ROLL_UP. An
 * undirected arpeggiate is a plain wiggle with no arrow (ARPEGGIO_DIRECTIONLESS).
 */
function addArpeggio(staveNote: StaveNote, note: Note): void {
	const arpeggiate = note.child('notations')?.child('arpeggiate');
	if (!arpeggiate) {
		return;
	}
	const direction = arpeggiate.getAttribute('direction');
	const type =
		direction === 'up'
			? Stroke.Type.ROLL_DOWN
			: direction === 'down'
				? Stroke.Type.ROLL_UP
				: Stroke.Type.ARPEGGIO_DIRECTIONLESS;
	staveNote.addModifier(new Stroke(type), 0);
}

/*
 * Honor an explicit <stem>up|down (e.g. to separate two voices on one stave).
 * Absent, auto-pick from staff position (see vexflowChord's auto_stem).
 */
function applyStem(staveNote: StaveNote, note: Note): void {
	switch (note.stem) {
		case 'up':
			staveNote.setStemDirection(Stem.UP);
			break;
		case 'down':
			staveNote.setStemDirection(Stem.DOWN);
			break;
	}
}

/*
 * Stack each chord member's printed <accidental> onto its notehead. A dead/muted note
 * (X notehead) has no definite pitch, so a printed accidental on it is meaningless —
 * skip it. (Transcription exports sometimes emit one anyway; on a grace note it also
 * collides with the cross glyph instead of sitting clear to its left.)
 *
 * A tie-stop note is the same sounding pitch as its tie-start: the accidental was already
 * declared there and carries over, so skip it even when the MusicXML redundantly repeats it.
 */
function addAccidentals(staveNote: StaveNote, chord: Chord): void {
	chord.notes.forEach((note, i) => {
		if (isXNotehead(note) || isTieStop(note)) {
			return;
		}
		const code = note.accidental && ACCIDENTAL_CODES[note.accidental.value];
		if (code) {
			staveNote.addModifier(new Accidental(code), i);
		}
	});
}

/*
 * Wrap each parenthesized chord member's notehead in round brackets. Per-member (like
 * accidentals) rather than Parenthesis.buildAndAttach, which brackets every notehead.
 */
function addParentheses(staveNote: StaveNote, chord: Chord): void {
	chord.notes.forEach((note, i) => {
		if (isParenthesized(note)) {
			staveNote.addModifier(new Parenthesis(Modifier.Position.LEFT), i);
			staveNote.addModifier(new Parenthesis(Modifier.Position.RIGHT), i);
		}
	});
}

/*
 * Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
 * a single note is a one-member chord). Rests render as a centered rest glyph;
 * grace notes (no <duration>) become small GraceNotes — slashed for an
 * acciaccatura — which vexflowVoiceTickables groups onto their host note; pitched
 * notes stack their keys and carry each member's printed accidental, dots, stem
 * direction, and articulations.
 */
export function vexflowChord(
	chord: Chord,
	clef: string,
	alignCenter = false,
): StaveNote {
	const lead = chord.lead;
	const duration = durationCode(lead);
	// Pass `dots` to the constructor so vexflow counts the dot(s) in the note's ticks
	// (Dot.buildAndAttach only draws the glyph, it never changes duration). Without it
	// a dotted note is one tick-position short and its voice falls out of alignment
	// with the others sharing the stave.
	if (lead.isRest) {
		const rest = new StaveNote({
			keys: ['b/4'],
			duration: `${duration}r`,
			dots: lead.dots,
			// A whole rest alone in a measure is a full-measure rest: engraving convention
			// centers it horizontally (the formatter does the centering, see vexflowVoiceTickables).
			alignCenter,
		});
		addDots(rest, lead);
		return rest;
	}
	if (lead.isGrace) {
		const grace = new GraceNote({
			keys: chord.notes.map(vexflowKey),
			duration,
			// slash="yes" on the <grace> element marks an acciaccatura (a stroke
			// through the stem/flag); its absence is a plain appoggiatura.
			slash: lead.child('grace')?.getAttribute('slash') === 'yes',
		});
		addAccidentals(grace, chord);
		return grace;
	}
	const staveNote = new StaveNote({
		keys: chord.notes.map(vexflowKey),
		duration,
		dots: lead.dots,
		clef,
		// No explicit <stem>: let vexflow choose the direction from staff position.
		autoStem: !lead.stem,
	});
	addAccidentals(staveNote, chord);
	addParentheses(staveNote, chord);
	addDots(staveNote, lead);
	applyStem(staveNote, lead);
	addArticulations(staveNote, lead);
	addFermata(staveNote, lead);
	addArpeggio(staveNote, lead);
	return staveNote;
}

/*
 * <bend-alter> in semitones -> the label drawn above the bend arrow. Guitar bends
 * are notated in whole steps: 2 semitones = "1", 1 = "½", 3 = "1½", 4 = "2".
 */
function bendLabel(semitones: number): string {
	const whole = Math.floor(semitones / 2);
	const half = semitones % 2 === 1 ? '½' : '';
	return whole > 0 ? `${whole}${half}` : half || '0';
}

/*
 * A tab-stave text Annotation (palm mute "P.M.", a dead-note "x", …), justified above
 * the fret numbers.
 */
function tabAnnotation(text: string, noteWidth: number): Annotation {
	const annotation = new Annotation(text).setVerticalJustification(
		Annotation.VerticalJustify.TOP,
	);
	// The fret glyph draws centered on the note's x (drawPositions: tabX = x - width/2), but the
	// formatter lands an ABOVE annotation half a note-width to the right of it. The modifier
	// formatter treats xShift as a leftward shift, so half a note-width re-centers the text over
	// the fret. (Centering is width-independent here, so the text font's measured width — narrow
	// in the notation-first stack — doesn't affect it.)
	annotation.setXShift(noteWidth / 2);
	return annotation;
}

/*
 * Attach the lead note's tablature articulations to its TabNote, reading straight
 * from <notations>: a <bend> (with optional <release/> for a bend-and-release),
 * free-text <other-technical>, and <ornaments><wavy-line> vibrato. All are vexflow
 * modifiers, so attaching them here means the layout pass — which also calls this —
 * sizes measures with the extra width they take. (A <harmonic> is drawn as an
 * angle-bracketed fret in tabPositions, not a modifier.)
 */
function addTabModifiers(tabNote: TabNote, lead: Note): void {
	const technical = lead.child('notations')?.child('technical');
	const bend = technical?.child('bend');
	if (bend) {
		const semitones = Number(bend.child('bend-alter')?.text ?? '0');
		const phrase = [{ type: Bend.UP, text: bendLabel(semitones) }];
		// ponytail: a <release/> child draws a bend-then-release (up-down arrow); a
		// release to a non-zero target would need its own label — add when a fixture wants it.
		if (bend.child('release')) {
			phrase.push({ type: Bend.DOWN, text: '' });
		}
		tabNote.addModifier(new Bend(phrase), 0);
	}
	const other = technical?.child('other-technical')?.text;
	if (other) {
		const noteWidth = (tabNote as unknown as { width: number }).width;
		tabNote.addModifier(tabAnnotation(other, noteWidth), 0);
	}
	if (lead.wavyLines.some((w) => w.wavyLineType === 'start')) {
		tabNote.addModifier(new Vibrato(), 0);
	}
}

/*
 * Each chord member's <string>/<fret> as a vexflow tab position (string 1 =
 * highest-pitched, an open string is fret 0). A natural harmonic is notated as the fret
 * in angle brackets, e.g. <12> — vexflow renders the fret string verbatim.
 *
 * A tie-stop fret is the held tail of a tie: the string isn't re-struck, so guitar tab
 * convention omits its number (unlike a slur/hammer-on/pull-off, which changes fret and
 * is drawn). Filter those out; a wholly-held chord never reaches here — vexflowTabTickables
 * replaces it with a ghost note — but keep an all-members fallback so the grace path (which
 * also calls this) can never hand vexflow an empty position list.
 */
function tabPositions(chord: Chord) {
	const toPosition = (note: Chord['notes'][number]) => {
		const fret = note.fret ?? 0;
		// A dead note (<notehead>x</notehead>) prints "X" on its string instead of a fret;
		// a harmonic angle-brackets its fret. vexflow renders the fret string verbatim.
		let fretText: string | number = fret;
		if (isXNotehead(note)) {
			// A dingbat "✕" (U+2715), not an ASCII "X": the notation font (Bravura) draws an
			// ornate glyph for "X" and would win the CSS font fallthrough, but it lacks this
			// dingbat, so the fret falls through to the plain text font like the fret digits do.
			fretText = '✕';
		} else if (isHarmonic(note)) {
			fretText = `<${fret}>`;
		} else if (isParenthesized(note)) {
			// A ghost/optional fret reads as "(2)". vexflow renders the fret string verbatim.
			fretText = `(${fret})`;
		}
		return {
			str: note.string ?? 1,
			fret: fretText,
		};
	};
	const struck = chord.notes.filter((note) => !isTieStop(note));
	return (struck.length > 0 ? struck : chord.notes).map(toPosition);
}

/*
 * True when the note is the held tail of a tie (carries a tieType 'stop'). Such a string
 * isn't re-struck, so its fret is omitted from the tab.
 */
function isTieStop(note: Chord['notes'][number]): boolean {
	return note.ties.some((tie) => tie.tieType === 'stop');
}

/*
 * Build a vexflow TabNote for one chord on a tablature stave: each member's
 * <string>/<fret> becomes a position (string 1 = highest-pitched). Tab notes carry
 * no clef, accidentals, or stems — just the fret numbers stacked on their strings,
 * plus any bend/vibrato/annotation modifiers from <notations>.
 */
export function vexflowTabChord(chord: Chord): TabNote {
	const lead = chord.lead;
	const duration = durationCode(lead);
	const tabNote = new TabNote({
		positions: tabPositions(chord),
		duration,
		// Count the dot(s) in the note's ticks (as the notation path does) so a dotted
		// tab note isn't a tick-position short and drift out of alignment with the
		// notation stave it's formatted against. Tab omits the drawn dot glyph.
		dots: lead.dots,
	});
	styleFrets(tabNote);
	addTabModifiers(tabNote, lead);
	return tabNote;
}

/*
 * VexFlow draws a TabNote's fret digits — and the staff-line gap it clears behind them —
 * centered on the note's start x, but a StaveNote anchors its notehead's LEFT edge there
 * (the notehead's center sits half a glyph-width to the right). So a fret lines up under
 * the notehead's left edge, not its center. formatAndDrawSystem recenters by shifting the
 * whole tab note area right by this; doing it there rather than via the fret's own xShift
 * keeps the cleared gap moving with the digit (clearRect ignores xShift). The width is a
 * font metric needing a live canvas, so probe it lazily off a throwaway StaveNote and
 * cache the first non-zero read.
 */
let noteheadHalfWidth = 0;
export function getNoteheadHalfWidth(): number {
	if (noteheadHalfWidth === 0) {
		noteheadHalfWidth =
			new StaveNote({ keys: ['c/4'], duration: 'q' }).getGlyphWidth() / 2;
	}
	return noteheadHalfWidth;
}

type FretElement = Element & { fontWeight: string };

/*
 * Bold and enlarge a fret digit Element, re-centering it vertically on its string line.
 */
function boldFret(el: FretElement, scale: number): void {
	el.fontWeight = 'bold';
	el.setFontSize(el.fontSizeInPoints * scale);
	el.setYShift(el.getHeight() / 2);
}

/*
 * One thin (non-bold) angle bracket, sized to match the bolded digits it flanks. Mirrors
 * VexFlow's TabNote.tabToElement so it picks up the default 'TabNote.text' font. The +1
 * drops the bracket a pixel below dead-center so it sits optically level with the heavier
 * bold digits (the thin glyph otherwise reads as floating high).
 */
function harmonicBracket(glyph: '<' | '>', scale: number): Element {
	const el = new Element('TabNote.text');
	el.setText(glyph);
	el.setFontSize(el.fontSizeInPoints * scale);
	el.setYShift(el.getHeight() / 2 + 1);
	return el;
}

/*
 * A natural harmonic fret reads as "<12>": the angle brackets stay thin/unbolded while the
 * fret number inside is bold like an ordinary fret. VexFlow draws one fillText per Element,
 * so a single element can't mix weights — make the parent hold the bold digits and hang the
 * two thin brackets off it as child Elements (renderText draws children with their own
 * font). The pieces lay out left-to-right within the parent's reported width, which
 * drawPositions centers on the note x and clears the staff line behind.
 */
function styleHarmonicFret(el: FretElement, scale: number): void {
	const open = harmonicBracket('<', scale);
	const close = harmonicBracket('>', scale);
	el.setText(el.getText().replace(/[<>]/g, ''));
	boldFret(el, scale);
	const openWidth = open.getWidth();
	const digitsWidth = el.getWidth();
	open.setX(0);
	el.setXShift(openWidth);
	close.setX(openWidth + digitsWidth);
	el.addChild(open);
	el.addChild(close);
	// Set width last: any font/text change reinvalidates and would recompute it to the bare
	// digit width, dropping the brackets from centering and the cleared background.
	el.setWidth(openWidth + digitsWidth + close.getWidth());
}

/*
 * Restyle a TabNote's fret digits in place. VexFlow has no public API to set the
 * 'TabNote.text' metric globally (Metrics isn't exported), so override each fret Element
 * built in the constructor — fretElement is protected, hence the cast. Resizing rebuilds
 * each digit's vertical centering and the note width off the new glyphs so the formatter
 * reserves the right horizontal space. Grace notes pass a smaller scale.
 */
function styleFrets(
	tabNote: TabNote | GraceTabNote,
	scale = TAB_FRET_SCALE,
): void {
	const note = tabNote as unknown as {
		fretElement: FretElement[];
		width: number;
	};
	let width = 0;
	for (const el of note.fretElement) {
		if (el.getText().includes('<')) {
			styleHarmonicFret(el, scale);
		} else {
			boldFret(el, scale);
		}
		width = Math.max(el.getWidth(), width);
	}
	note.width = width;
}

/*
 * A grace TabNote (small fret numbers) for one grace chord, grouped onto the real
 * note it precedes by vexflowTabTickables. Frets are scaled to TAB_GRACE_SCALE of the
 * (already enlarged) main-note size so graces stay proportionally smaller.
 */
function vexflowTabGrace(chord: Chord): GraceTabNote {
	const duration = durationCode(chord.lead);
	const grace = new GraceTabNote({
		positions: tabPositions(chord),
		duration,
	});
	styleFrets(grace, TAB_FRET_SCALE * TAB_GRACE_SCALE);
	return grace;
}

/*
 * A tab voice's tickables: one TabNote per non-rest chord, in onset order. Grace
 * chords steal no time, so like vexflowVoiceTickables they're held aside and
 * attached to the next real note as a GraceNoteGroup modifier (drawn just left of
 * it). A rest reserves its duration with invisible GhostNotes rather than a drawn
 * rest glyph (tab convention omits rests) — without that reserved time, a tab note
 * after a rest slides left and falls out of vertical alignment with the notation
 * stave it's formatted against. `record` captures each chord's lead -> TabNote for
 * later hammer-on/pull-off resolution; the layout pass reuses this to size tab
 * measures and passes none.
 */
export function vexflowTabTickables(
	chords: Chord[],
	record?: (lead: Note, tabNote: TabNote) => void,
): StemmableNote[] {
	const tickables: StemmableNote[] = [];
	let pendingGrace: { note: GraceTabNote; lead: Note }[] = [];
	for (const chord of chords) {
		if (chord.lead.isRest) {
			tickables.push(...ghostNotes(chord.lead.beats ?? 0));
			continue;
		}
		if (chord.lead.isGrace) {
			pendingGrace.push({ note: vexflowTabGrace(chord), lead: chord.lead });
			continue;
		}
		// A wholly tied-into (held) chord re-strikes no string, so guitar tab convention
		// omits every fret. Reserve its time with invisible ghosts (keeping the tab aligned
		// with the notation stave, which still draws the tied noteheads) rather than printing
		// the held frets.
		if (chord.notes.every(isTieStop)) {
			tickables.push(...ghostNotes(chord.lead.beats ?? 0));
			continue;
		}
		const tabNote = vexflowTabChord(chord);
		if (pendingGrace.length > 0) {
			// No beamNotes() unlike the standard-notation path: tab grace notes have no
			// stem to anchor a beam, so beaming floats it off the staff — they render as
			// plain small fret numbers.
			const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
			// preFormat now so the width pad survives format()'s preFormatted guard.
			group.preFormat();
			group.setWidth(group.getWidth() + TAB_GRACE_SPACING);
			tabNote.addModifier(group, 0);
			// Record grace leads too so a slur from a grace note to its main note
			// resolves in buildHammerPulls (the GraceTabNote is a valid tie endpoint).
			for (const g of pendingGrace) {
				record?.(g.lead, g.note);
			}
			pendingGrace = [];
		}
		record?.(chord.lead, tabNote);
		tickables.push(tabNote);
	}
	return tickables;
}

// VexFlow duration code -> quarter-note beats, largest first.
const GHOST_DURATIONS: [code: string, beats: number][] = [
	['w', 4],
	['h', 2],
	['q', 1],
	['8', 0.5],
	['16', 0.25],
	['32', 0.125],
	['64', 0.0625],
	['128', 0.03125],
];

/*
 * Fill a timing gap (in quarter-note beats) with invisible GhostNotes: tickables
 * that reserve the gap's time but draw nothing, so a voice that starts late or has
 * an internal hole stays aligned with its sibling voices. Greedy largest-first;
 * MusicXML gaps are dyadic, so this lands exactly down to a 128th (the epsilon
 * guards float drift). ponytail: a non-dyadic gap (e.g. a lone tuplet-sized hole)
 * drops a sub-128th remainder — add tuplet ghosts if that ever shows up.
 */
function ghostNotes(beats: number): GhostNote[] {
	const ghosts: GhostNote[] = [];
	let remaining = beats;
	for (const [duration, value] of GHOST_DURATIONS) {
		while (remaining >= value - EPSILON) {
			ghosts.push(new GhostNote({ duration }));
			remaining -= value;
		}
	}
	return ghosts;
}

/*
 * A meter's length in quarter-note beats (4/4 -> 4, 6/8 -> 3, 2/2 -> 4). 0 when
 * unmetered or absent, so callers fall back to the content's own end. Flooring a
 * measure's endBeat at this pads an underfull measure (e.g. a final fragment) with
 * trailing ghosts, reserving the missing time as blank space instead of letting the
 * formatter justify the last note flush against the end barline.
 */
export function meterBeats(time: Time | null): number {
	if (!time || time.isSenzaMisura) {
		return 0;
	}
	const beats = Number(time.beats);
	const beatType = Number(time.beatType);
	if (!beats || !beatType) {
		return 0;
	}
	return (beats / beatType) * 4;
}

/** A metronome mark: the beat-unit's vexflow duration code plus its bpm. */
export type TempoMark = { duration: string; bpm: number };

/*
 * A measure's metronome mark from the first <direction> that carries a
 * <metronome>, or null when none does. MusicXML's <beat-unit> names ('quarter',
 * 'eighth', 'half', ...) already match StaveTempo's duration codes. bpm comes from
 * <per-minute>, falling back to the <sound tempo>, then to 120 — so a metronome
 * directive without a number still prints "= 120".
 * ponytail: dotted beat-units (<beat-unit-dot/>) ignored; add a `dots` field if a
 * fixture needs a dotted metronome note.
 */
export function tempoOf(measure: Measure): TempoMark | null {
	for (const direction of measure.directions) {
		const metronome = direction.child('direction-type')?.child('metronome');
		if (!metronome) {
			continue;
		}
		const duration = metronome.child('beat-unit')?.text ?? 'quarter';
		const perMinute = metronome.child('per-minute')?.text;
		const sound = direction.child('sound')?.getAttribute('tempo');
		return { duration, bpm: Number(perMinute ?? sound) || DEFAULT_TEMPO_BPM };
	}
	return null;
}

/*
 * A measure's <direction><direction-type><words> text directives (e.g. "ritardando",
 * "dolce"), in document order. These are free-text expressions printed above the stave.
 * ponytail: placement and font-style attributes ignored — every words direction prints
 * above the staff in italics; add a placement/style field if a fixture needs below or
 * upright words.
 */
export function wordsOf(measure: Measure): string[] {
	const out: string[] = [];
	for (const direction of measure.directions) {
		const words = direction.child('direction-type')?.child('words')?.text;
		if (words) {
			out.push(words);
		}
	}
	return out;
}

// A <direction><direction-type><pedal> spanner marker, bound to the lead note it
// anchors. `line` carries the MusicXML line="yes" flag (bracket pedal vs. the
// default "Ped…*" text); it rides on every marker so the stop knows the style.
export type PedalMark = {
	lead: Note;
	type: 'start' | 'stop';
	number: string;
	line: boolean;
};

/*
 * A measure's pedal markers, in document order: a "start" binds to the next note
 * (the pedal goes down there), a "stop" to the previous note (the last note still
 * held). Directions sit between notes, so walk the children tracking the last lead
 * and any starts pending a note.
 * ponytail: only start/stop handled — change/continue/sostenuto/discontinue
 * pedal directions are ignored; add them if a fixture needs a re-pedal or sostenuto.
 */
export function pedalsOf(measure: Measure): PedalMark[] {
	const out: PedalMark[] = [];
	const pendingStarts: { number: string; line: boolean }[] = [];
	let lastLead: Note | null = null;
	for (const child of measure.children) {
		if (child instanceof MElement && child.tag === 'direction') {
			const pedal = child.child('direction-type')?.child('pedal');
			const type = pedal?.getAttribute('type');
			if (type === 'start' || type === 'stop') {
				const number = pedal?.getAttribute('number') ?? '1';
				const line = pedal?.getAttribute('line') === 'yes';
				if (type === 'start') {
					pendingStarts.push({ number, line });
				} else if (lastLead) {
					out.push({ lead: lastLead, type, number, line });
				}
			}
		} else if (child instanceof Note && !child.isChordMember) {
			for (const start of pendingStarts) {
				out.push({ lead: child, type: 'start', ...start });
			}
			pendingStarts.length = 0;
			lastLead = child;
		}
	}
	return out;
}

// MusicXML <root-alter>/<bass-alter> semitones -> the printed accidental sign, using the
// real Unicode music symbols (♯ ♭ ♮). 0 prints an explicit natural — rare in a root, but
// MusicXML carries it when the chart wants the sign drawn. An absent <root-alter> maps to
// nothing (no sign), so plain roots stay bare.
const HARMONY_ALTER: Record<string, string> = { '1': '♯', '-1': '♭', '0': '♮' };

/*
 * Swap the ASCII accidentals a <kind text="…"> suffix carries for an extension (e.g.
 * "7(b9#11)") for the real Unicode signs ("7(♭9♯11)"), so they match the root's ♭/♯
 * and pick up drawHarmony's smaller accidental sizing. An accidental in an extension
 * always sits before its scale-degree number, so the digit lookahead avoids touching
 * any letter that just happens to be a "b" (none of the suffix words use one, but the
 * lookahead keeps it unambiguous).
 */
function harmonyExtensionSigns(kind: string): string {
	return kind.replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
}

/*
 * A <harmony>'s printed chord symbol, e.g. "G7", "C", "F♯m": the <root-step> plus
 * any <root-alter> sign, then the <kind text="…"> suffix MusicXML carries for
 * exactly this (a major triad's text is empty, so it prints the bare root). A
 * <bass> (slash chord) appends "/<bass-step><bass-alter>", e.g. "E♭/B♭".
 * ponytail: a <kind> without a text attribute prints just the root — no
 * kind-name->suffix table (major-seventh -> "maj7", …); add one if a fixture needs it.
 */
function harmonyText(harmony: MElement): string {
	const root = harmony.child('root');
	const step = root?.child('root-step')?.text ?? '';
	const alter = root?.child('root-alter')?.text ?? '';
	const kind = harmonyExtensionSigns(
		harmony.child('kind')?.getAttribute('text') ?? '',
	);
	const bass = harmony.child('bass');
	const bassStep = bass?.child('bass-step')?.text ?? '';
	const bassAlter = bass?.child('bass-alter')?.text ?? '';
	const bassText = bassStep
		? `/${bassStep}${HARMONY_ALTER[bassAlter] ?? ''}`
		: '';
	return step + (HARMONY_ALTER[alter] ?? '') + kind + bassText;
}

/*
 * The chord-diagram (<frame>) carried by a <harmony>, parsed into the ChordDiagram
 * spec. MusicXML <fret>s are absolute, so they're shifted to be relative to
 * <first-fret> (the top displayed fret line, drawn as the position label). Strings
 * with no <frame-note> are muted ('x'); fret 0 is an open string. A <barre> spans
 * from its `start` frame-note's string to its `stop` frame-note's string, at the
 * shared (relative) fret. Returns null when the harmony carries no <frame>.
 * MusicXML numbers strings high-to-low (1 = highest), matching the ChordDiagram's
 * left-to-right (string 1 rightmost) convention.
 */
function frameOf(harmony: MElement): ChordFrame | null {
	const frame = harmony.child('frame');
	if (!frame) {
		return null;
	}
	const numStrings = Number(frame.child('frame-strings')?.text) || 6;
	const frameNotes = frame.childrenNamed('frame-note');

	// string -> absolute fret (0 = open); skip notes with a non-numeric string.
	const absFret = new Map<number, number>();
	for (const fn of frameNotes) {
		const string = Number(fn.child('string')?.text);
		if (Number.isFinite(string)) {
			absFret.set(string, Number(fn.child('fret')?.text) || 0);
		}
	}
	const fretted = [...absFret.values()].filter((f) => f > 0);

	// <first-fret> is the absolute fret of the box's top line. Lead sheets often omit it, so
	// derive it: a chord with no open strings whose lowest fretted note is past the nut
	// starts the box at that fret instead of drawing a tall, mostly-empty box down from the
	// nut. Open strings pin the box to the nut (firstFret 1).
	const explicitFirstFret = Number(frame.child('first-fret')?.text);
	const hasOpen = [...absFret.values()].includes(0);
	const firstFret =
		explicitFirstFret ||
		(fretted.length > 0 && !hasOpen ? Math.min(...fretted) : 1);
	const toRelative = (abs: number) => (abs === 0 ? 0 : abs - firstFret + 1);

	const played = new Map<number, number>(); // string -> relative fret
	const barreStart = new Map<number, number>(); // relative fret -> from string
	const barres: ChordFrame['barres'] = [];
	for (const fn of frameNotes) {
		const string = Number(fn.child('string')?.text);
		if (!Number.isFinite(string)) {
			continue;
		}
		const relFret = toRelative(Number(fn.child('fret')?.text) || 0);
		played.set(string, relFret);
		const barre = fn.child('barre')?.getAttribute('type');
		if (barre === 'start') {
			barreStart.set(relFret, string);
		} else if (barre === 'stop') {
			const from = barreStart.get(relFret);
			if (from !== undefined) {
				barres?.push({ fromString: from, toString: string, fret: relFret });
			}
		}
	}

	// Position label, for movable shapes only (box not at the nut). Its number is the fret of
	// the lowest-sounding fretted string (the highest played string number), drawn beside
	// that note's row rather than at the box top — guitarists finger from the lowest string
	// up, so the number marks where the hand sits. The box layout still keys off firstFret
	// (the lowest fret), so the dots stay compact regardless of where the label lands.
	let position = firstFret;
	let positionText = 0;
	if (firstFret > 1 && fretted.length > 0) {
		const lowString = Math.max(
			...[...absFret].filter(([, f]) => f > 0).map(([s]) => s),
		);
		const lowFret = absFret.get(lowString) as number;
		position = lowFret;
		positionText = lowFret - firstFret;
	}

	const chord: ChordFrame['chord'] = [];
	for (let s = 1; s <= numStrings; s += 1) {
		chord.push([s, played.has(s) ? (played.get(s) as number) : 'x']);
	}
	return { chord, position, positionText, barres };
}

/*
 * Each <harmony> in a measure paired with the lead note it sits above. <harmony>
 * elements are interleaved with <note>s in document order and apply to the note
 * that follows, so walk the measure's children tracking the pending harmony and
 * bind it to the next chord lead (the next non-<chord/> note). `frame` is the
 * chord-diagram spec when the harmony carries a <frame>, else null.
 */
export function harmoniesOf(
	measure: Measure,
): { lead: Note; text: string; frame: ChordFrame | null }[] {
	const harmonies: { lead: Note; text: string; frame: ChordFrame | null }[] =
		[];
	let pending: MElement | null = null;
	for (const child of measure.children) {
		if (child instanceof MElement && child.tag === 'harmony') {
			pending = child;
		} else if (pending && child instanceof Note && !child.isChordMember) {
			const text = harmonyText(pending);
			const frame = frameOf(pending);
			if (text || frame) {
				harmonies.push({ lead: child, text, frame });
			}
			pending = null;
		}
	}
	return harmonies;
}

/*
 * The beat a measure's voices run out to: the latest onset+duration across them.
 * Voices that end before this (e.g. one silent on the final beat via <forward>)
 * are padded out to it so every voice spans the same range — see the trailing
 * fill in vexflowVoiceTickables.
 */
export function endBeatOf(voices: { chords: Chord[] }[]): number {
	let end = 0;
	for (const { chords } of voices) {
		const last = chords.at(-1);
		if (last) {
			end = Math.max(end, (last.measureBeat ?? 0) + (last.lead.beats ?? 0));
		}
	}
	return end;
}

/*
 * A voice's tickables in onset order: each chord's StaveNote, with GhostNotes
 * filling any gap before the first chord, between chords, or after the last chord
 * up to `endBeat`. A voice placed by <backup>/<forward> needn't start at beat 0,
 * be contiguous, or run to the measure's end, so the chords' own measureBeats —
 * not document order — decide where each note lands, keeping it aligned with the
 * other voices on the stave. Without the trailing fill, a voice that stops early
 * lets the formatter cram the other voices' later notes against its last note.
 * `record` captures each chord's lead -> StaveNote for later spanner resolution.
 */
export function vexflowVoiceTickables(
	chords: Chord[],
	clef: string,
	endBeat = 0,
	record?: (lead: Note, staveNote: StaveNote) => void,
): StemmableNote[] {
	const tickables: StemmableNote[] = [];
	// A lone whole rest fills the whole measure; center its glyph (full-measure-rest convention).
	const soleLead = chords.filter((c) => !c.lead.isGrace).map((c) => c.lead);
	const centerWholeRest =
		soleLead.length === 1 &&
		soleLead[0]?.isRest &&
		soleLead[0]?.type === 'whole';
	let cursor = 0;
	// Grace notes steal no time, so they aren't tickables: they accumulate here and
	// attach to the next real note as a GraceNoteGroup modifier, drawn just left of it.
	let pendingGrace: { note: GraceNote; lead: Note }[] = [];
	for (const chord of chords) {
		if (chord.lead.isGrace) {
			pendingGrace.push({
				note: vexflowChord(chord, clef) as GraceNote,
				lead: chord.lead,
			});
			continue;
		}
		const onset = chord.measureBeat ?? cursor;
		if (onset > cursor + EPSILON) {
			tickables.push(...ghostNotes(onset - cursor));
		}
		const staveNote = vexflowChord(chord, clef, centerWholeRest);
		if (pendingGrace.length > 0) {
			const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
			// Beam the group when its grace notes carry <beam> markers (the main beam
			// pass skips them — grace notes never enter `byLead`).
			if (pendingGrace.some((g) => g.lead.beams.length > 0)) {
				group.beamNotes();
			}
			// preFormat now so the group's width is available to the layout pass (which reads
			// it to allocate the measure extra room) and stable for draw.
			group.preFormat();
			staveNote.addModifier(group, 0);
			// Give the grace cluster breathing room from the preceding note by padding that
			// note's RIGHT, which pushes the host (and its attached grace) right together so
			// the gap opens before the grace while it stays snug to its host. Inflating the
			// host's own left reservation instead would just let the grace drift left off it.
			// setRightDisplacedHeadPx survives format (only the constructor resets it), but
			// vexflow draws augmentation dots after that displaced-head gap — so skip a note
			// that carries dots, which would otherwise be flung out to the right.
			const prev = tickables.at(-1);
			const prevHasDots = prev
				?.getModifiers()
				.some((m) => m.getCategory() === 'Dot');
			if (prev && !prevHasDots) {
				prev.setRightDisplacedHeadPx(
					prev.getRightDisplacedHeadPx() + GRACE_SPACING,
				);
			}
			// Record grace leads too so a slur from a grace note to its main note
			// resolves in buildSlurs (the GraceNote is a valid Curve endpoint).
			for (const g of pendingGrace) {
				record?.(g.lead, g.note);
			}
			pendingGrace = [];
		}
		record?.(chord.lead, staveNote);
		tickables.push(staveNote);
		cursor = onset + (chord.lead.beats ?? 0);
	}
	// ponytail: trailing grace notes with no following host note are dropped — vexflow
	// anchors a GraceNoteGroup to the note it precedes. Add an anchor if a fixture needs it.
	if (endBeat > cursor + EPSILON) {
		tickables.push(...ghostNotes(endBeat - cursor));
	}
	return tickables;
}

/*
 * Find a note's first attached modifier of a given vexflow category (a GraceNoteGroup,
 * Bend, Vibrato, …), or undefined. vexflow types getModifiers() loosely, so the find needs
 * a cast; centralizing it keeps that one unsafe cast in a single auditable place instead of
 * hand-copied at each call site — including across modules, since layout can't import draw
 * and its graceWidthOf would otherwise re-roll the same find.
 */
export function findModifier<T extends Modifier>(
	note: { getModifiers(): { getCategory(): string }[] },
	category: string,
): T | undefined {
	return note.getModifiers().find((m) => m.getCategory() === category) as
		| T
		| undefined;
}

/*
 * Wrap tickables in a SOFT-mode vexflow Voice at the score's softmax factor. The width-
 * measuring pass (layout's measureNoteArea) and the draw pass (buildNotes/buildTabNotes)
 * must build their voices identically, or the measured width and the drawn width disagree
 * and notes shear; sharing this builder keeps the two passes in lockstep by construction.
 */
export function softVoice(
	tickables: StemmableNote[],
	softmaxFactor: number,
): Voice {
	return new Voice()
		.setMode(Voice.Mode.SOFT)
		.setSoftmaxFactor(softmaxFactor)
		.addTickables(tickables);
}
