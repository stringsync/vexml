import type { Chord, Note, Voice as ScoreVoice, Time } from '@stringsync/mdom';
import {
	Accidental,
	Annotation,
	Articulation,
	Bend,
	Dot,
	type Element,
	GhostNote,
	GraceNote,
	GraceNoteGroup,
	GraceTabNote,
	StaveNote,
	Stem,
	type StemmableNote,
	TabNote,
	Vibrato,
} from 'vexflow';

// One staff's renderable voices in a measure: voices assigned to this staff that
// actually carry notes (an empty voice would crash the formatter). The layout
// (measuring) and draw passes must select identically, so the predicate lives here.
export function staffVoices(
	voices: ScoreVoice[],
	staffNumber: string,
): ScoreVoice[] {
	return voices.filter((v) => v.staff === staffNumber && v.chords.length > 0);
}

// MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
// unknown combinations fall back to treble.
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

// A note's vexflow duration code. An absent <type> defaults to a quarter; an
// unrecognized type also falls back to 'q'.
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

// A <harmonic> in this note's <notations><technical>: drawn as a diamond notehead on a
// notation stave (see vexflowKey) and as an angle-bracketed fret on tab (see tabPositions).
function isHarmonic(note: Note): boolean {
	return !!note.child('notations')?.child('technical')?.child('harmonic');
}

// A note's vexflow key, e.g. C#5 -> 'c/5'. A harmonic appends the '/H' notehead code so
// vexflow draws a diamond (open for half+/whole, filled for quarter). Rests have no pitch;
// callers handle them.
function vexflowKey(note: Note): string {
	const pitch = note.pitch;
	if (!pitch) {
		return 'b/4';
	}
	const key = `${pitch.step.toLowerCase()}/${pitch.octave}`;
	return isHarmonic(note) ? `${key}/H` : key;
}

// Augmentation dots.
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

function addArticulations(staveNote: StaveNote, note: Note): void {
	for (const name of note.articulations) {
		const code = ARTICULATION_CODES[name];
		if (code) {
			staveNote.addModifier(new Articulation(code));
		}
	}
}

// Honor an explicit <stem>up|down (e.g. to separate two voices on one stave).
// Absent, auto-pick from staff position (see vexflowChord's auto_stem).
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

// Stack each chord member's printed <accidental> onto its notehead.
function addAccidentals(staveNote: StaveNote, chord: Chord): void {
	chord.notes.forEach((note, i) => {
		const code = note.accidental && ACCIDENTAL_CODES[note.accidental.value];
		if (code) {
			staveNote.addModifier(new Accidental(code), i);
		}
	});
}

// Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
// a single note is a one-member chord). Rests render as a centered rest glyph;
// grace notes (no <duration>) become small GraceNotes — slashed for an
// acciaccatura — which vexflowVoiceTickables groups onto their host note; pitched
// notes stack their keys and carry each member's printed accidental, dots, stem
// direction, and articulations.
export function vexflowChord(chord: Chord, clef: string): StaveNote {
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
	addDots(staveNote, lead);
	applyStem(staveNote, lead);
	addArticulations(staveNote, lead);
	return staveNote;
}

// <bend-alter> in semitones -> the label drawn above the bend arrow. Guitar bends
// are notated in whole steps: 2 semitones = "1", 1 = "½", 3 = "1½", 4 = "2".
function bendLabel(semitones: number): string {
	const whole = Math.floor(semitones / 2);
	const half = semitones % 2 === 1 ? '½' : '';
	return whole > 0 ? `${whole}${half}` : half || '0';
}

// A tab-stave text Annotation (palm mute "P.M.", a dead-note "x", …), justified above
// the fret numbers.
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

// Attach the lead note's tablature articulations to its TabNote, reading straight
// from <notations>: a <bend> (with optional <release/> for a bend-and-release),
// free-text <other-technical>, and <ornaments><wavy-line> vibrato. All are vexflow
// modifiers, so attaching them here means the layout pass — which also calls this —
// sizes measures with the extra width they take. (A <harmonic> is drawn as an
// angle-bracketed fret in tabPositions, not a modifier.)
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

// Each chord member's <string>/<fret> as a vexflow tab position (string 1 =
// highest-pitched, an open string is fret 0). A natural harmonic is notated as the fret
// in angle brackets, e.g. <12> — vexflow renders the fret string verbatim.
function tabPositions(chord: Chord) {
	return chord.notes.map((note) => {
		const fret = note.fret ?? 0;
		return {
			str: note.string ?? 1,
			fret: isHarmonic(note) ? `<${fret}>` : fret,
		};
	});
}

// Build a vexflow TabNote for one chord on a tablature stave: each member's
// <string>/<fret> becomes a position (string 1 = highest-pitched). Tab notes carry
// no clef, accidentals, or stems — just the fret numbers stacked on their strings,
// plus any bend/vibrato/annotation modifiers from <notations>.
export function vexflowTabChord(chord: Chord): TabNote {
	const lead = chord.lead;
	const duration = durationCode(lead);
	const tabNote = new TabNote({
		positions: tabPositions(chord),
		duration,
	});
	styleFrets(tabNote);
	addTabModifiers(tabNote, lead);
	return tabNote;
}

// The default tab fret digits are thin and small — hard to read against the staff
// lines. Bump them bold and a touch larger.
// 1.258 * 9pt base ≈ 11.3pt ≈ 15.1px
const TAB_FRET_SCALE = 1.258;

// Restyle a TabNote's fret digits in place. VexFlow has no public API to set the
// 'TabNote.text' metric globally (Metrics isn't exported), so override each fret Element
// built in the constructor — fretElement is protected, hence the cast. Resizing rebuilds
// each digit's vertical centering and the note width off the new glyphs so the formatter
// reserves the right horizontal space. Grace notes pass a smaller scale.
function styleFrets(
	tabNote: TabNote | GraceTabNote,
	scale = TAB_FRET_SCALE,
): void {
	const note = tabNote as unknown as {
		fretElement: (Element & { fontWeight: string })[];
		width: number;
	};
	let width = 0;
	for (const el of note.fretElement) {
		// ponytail: harmonics carry bracket text ("<12>") — left at default thin, unbolded
		// size so the brackets stay narrow. VexFlow centers the digits on the note x, so the
		// wide bracketed text overhangs the start barline; nudge it right by half its width to
		// clear it.
		if (el.getText().includes('<')) {
			el.setXShift(el.getWidth() / 2);
		} else {
			el.fontWeight = 'bold';
			el.setFontSize(el.fontSizeInPoints * scale);
			el.setYShift(el.getHeight() / 2);
		}
		width = Math.max(el.getWidth(), width);
	}
	note.width = width;
}

// VexFlow's GraceTabNote.fontScale (2/3) only shrinks the stem; the fret digits are
// separate Elements typed 'TabNote.text' (fontScale 1.0), so without this they draw
// full size — same as GraceNote does for standard notation, which scales its glyphs.
const TAB_GRACE_SCALE = 2 / 3;

// VexFlow's GraceNoteGroup.format uses groupSpacingTab = 0, so tab grace frets butt
// right up against the main note. Pad the group's reserved width to open Soundslice-
// style breathing room before the host note (the extra width becomes a trailing gap).
const TAB_GRACE_SPACING = 14;

// A grace TabNote (small fret numbers) for one grace chord, grouped onto the real
// note it precedes by vexflowTabTickables. Frets are scaled to TAB_GRACE_SCALE of the
// (already enlarged) main-note size so graces stay proportionally smaller.
function vexflowTabGrace(chord: Chord): GraceTabNote {
	const duration = durationCode(chord.lead);
	const grace = new GraceTabNote({
		positions: tabPositions(chord),
		duration,
	});
	styleFrets(grace, TAB_FRET_SCALE * TAB_GRACE_SCALE);
	return grace;
}

// A tab voice's tickables: one TabNote per non-rest chord, in onset order. Grace
// chords steal no time, so like vexflowVoiceTickables they're held aside and
// attached to the next real note as a GraceNoteGroup modifier (drawn just left of
// it). Unlike vexflowVoiceTickables there's no ghost-note gap filling — the
// roadmap's tab lines are single-voice and contiguous. `record` captures each
// chord's lead -> TabNote for later hammer-on/pull-off resolution; the layout pass
// reuses this to size tab measures and passes none.
export function vexflowTabTickables(
	chords: Chord[],
	record?: (lead: Note, tabNote: TabNote) => void,
): TabNote[] {
	const tickables: TabNote[] = [];
	let pendingGrace: GraceTabNote[] = [];
	for (const chord of chords) {
		if (chord.lead.isRest) {
			continue;
		}
		if (chord.lead.isGrace) {
			pendingGrace.push(vexflowTabGrace(chord));
			continue;
		}
		const tabNote = vexflowTabChord(chord);
		if (pendingGrace.length > 0) {
			// No beamNotes() unlike the standard-notation path: tab grace notes have no
			// stem to anchor a beam, so beaming floats it off the staff — they render as
			// plain small fret numbers.
			const group = new GraceNoteGroup(pendingGrace);
			// preFormat now so the width pad survives format()'s preFormatted guard.
			group.preFormat();
			group.setWidth(group.getWidth() + TAB_GRACE_SPACING);
			tabNote.addModifier(group, 0);
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

// Fill a timing gap (in quarter-note beats) with invisible GhostNotes: tickables
// that reserve the gap's time but draw nothing, so a voice that starts late or has
// an internal hole stays aligned with its sibling voices. Greedy largest-first;
// MusicXML gaps are dyadic, so this lands exactly down to a 128th (the epsilon
// guards float drift). ponytail: a non-dyadic gap (e.g. a lone tuplet-sized hole)
// drops a sub-128th remainder — add tuplet ghosts if that ever shows up.
function ghostNotes(beats: number): GhostNote[] {
	const ghosts: GhostNote[] = [];
	let remaining = beats;
	for (const [duration, value] of GHOST_DURATIONS) {
		while (remaining >= value - 1e-6) {
			ghosts.push(new GhostNote({ duration }));
			remaining -= value;
		}
	}
	return ghosts;
}

// A meter's length in quarter-note beats (4/4 -> 4, 6/8 -> 3, 2/2 -> 4). 0 when
// unmetered or absent, so callers fall back to the content's own end. Flooring a
// measure's endBeat at this pads an underfull measure (e.g. a final fragment) with
// trailing ghosts, reserving the missing time as blank space instead of letting the
// formatter justify the last note flush against the end barline.
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

// The beat a measure's voices run out to: the latest onset+duration across them.
// Voices that end before this (e.g. one silent on the final beat via <forward>)
// are padded out to it so every voice spans the same range — see the trailing
// fill in vexflowVoiceTickables.
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

// A voice's tickables in onset order: each chord's StaveNote, with GhostNotes
// filling any gap before the first chord, between chords, or after the last chord
// up to `endBeat`. A voice placed by <backup>/<forward> needn't start at beat 0,
// be contiguous, or run to the measure's end, so the chords' own measureBeats —
// not document order — decide where each note lands, keeping it aligned with the
// other voices on the stave. Without the trailing fill, a voice that stops early
// lets the formatter cram the other voices' later notes against its last note.
// `record` captures each chord's lead -> StaveNote for later spanner resolution.
export function vexflowVoiceTickables(
	chords: Chord[],
	clef: string,
	endBeat = 0,
	record?: (lead: Note, staveNote: StaveNote) => void,
): StemmableNote[] {
	const tickables: StemmableNote[] = [];
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
		if (onset > cursor + 1e-6) {
			tickables.push(...ghostNotes(onset - cursor));
		}
		const staveNote = vexflowChord(chord, clef);
		if (pendingGrace.length > 0) {
			const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
			// Beam the group when its grace notes carry <beam> markers (the main beam
			// pass skips them — grace notes never enter `byLead`).
			if (pendingGrace.some((g) => g.lead.beams.length > 0)) {
				group.beamNotes();
			}
			staveNote.addModifier(group, 0);
			pendingGrace = [];
		}
		record?.(chord.lead, staveNote);
		tickables.push(staveNote);
		cursor = onset + (chord.lead.beats ?? 0);
	}
	// ponytail: trailing grace notes with no following host note are dropped — vexflow
	// anchors a GraceNoteGroup to the note it precedes. Add an anchor if a fixture needs it.
	if (endBeat > cursor + 1e-6) {
		tickables.push(...ghostNotes(endBeat - cursor));
	}
	return tickables;
}
