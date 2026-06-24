import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { testCase } from '../testing/test-case';

const TEST_CASES = [
	// A single empty 5-line stave: staff lines with start and end barlines, nothing else.
	testCase('structure_single_stave.musicxml', 'structure_single_stave.png'),

	// One part with two empty staves joined by a curly brace (grand staff).
	testCase('structure_grand_staff.musicxml', 'structure_grand_staff.png'),

	// Two separate single-stave parts stacked vertically, with no connecting brace.
	testCase('structure_two_parts.musicxml', 'structure_two_parts.png'),

	// A single-stave part above a two-stave (braced) part — mixed stave counts.
	testCase('structure_mixed_staves.musicxml', 'structure_mixed_staves.png'),

	// A single empty stave with a treble (G) clef.
	testCase('clef_treble.musicxml', 'clef_treble.png'),

	// Grand staff: treble clef on the upper stave, bass clef on the lower, joined by a
	// brace.
	testCase('clef_treble_bass.musicxml', 'clef_treble_bass.png'),

	// A 6-line tablature stave with a stacked "TAB" label at the left.
	testCase('clef_tab_6_string.musicxml', 'clef_tab_6_string.png'),

	// A 4-line tablature stave with a stacked "TAB" label at the left.
	testCase('clef_tab_4_string.musicxml', 'clef_tab_4_string.png'),

	// A treble notation stave above a 6-line TAB stave, joined by a brace.
	testCase('clef_notation_and_tab.musicxml', 'clef_notation_and_tab.png'),

	// Treble stave with a 3-sharp key signature (F#, C#, G#).
	testCase('key_sharps.musicxml', 'key_sharps.png'),

	// Treble stave with a 2-flat key signature (Bb, Eb).
	testCase('key_flats.musicxml', 'key_flats.png'),

	// Treble stave with a numeric 3/4 time signature (stacked numerals).
	testCase('time_numeric.musicxml', 'time_numeric.png'),

	// Treble stave with the common-time (C) symbol.
	testCase('time_common.musicxml', 'time_common.png'),

	// Treble stave with the cut-time (¢) symbol.
	testCase('time_cut.musicxml', 'time_cut.png'),

	// Treble stave, 4/4: note durations on C5 — measure 1 a whole note; measure 2 a
	// half, quarter, eighth, sixteenth, then two thirty-seconds (increasing flag
	// counts).
	testCase('note_durations.musicxml', 'note_durations.png'),

	// Treble stave, 4/4, all on C5: measure 1 dotted-quarter + eighth pairs (single
	// dots); measure 2 double-dotted-quarter + sixteenth pairs (double dots);
	// measure 3 four beamed dotted-eighth + sixteenth pairs (dots inside beams).
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),

	// Treble stave, 4/4: the rest counterpart of note_durations — measure 1 a whole
	// rest; measure 2 half, quarter, eighth, sixteenth, then two thirty-second rests.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — sharp, flat,
	// natural, then no accidental — so only the accidental glyph varies.
	testCase('accidentals.musicxml', 'accidentals.png'),

	// Treble stave, 4/4: two measures split by a barline, each holding one whole note
	// (C5, same pitch in both).
	testCase('measures_two.musicxml', 'measures_two.png'),

	// Grand staff (empty treble over empty bass), two measures. The internal barline
	// between measures 1 and 2 is a plain single line on each staff. The piece's final
	// measure closes with a thin-thick end barline, and the connector joining the two
	// staves at that right edge is the matching bold thin-thick double line
	// (boldDoubleRight) rather than the plain single line drawn at non-final system
	// ends.
	testCase('measures_end_barline.musicxml', 'measures_end_barline.png'),

	// One system, treble 4/4: a key change mid-system. Measure 1 opens the system with
	// a treble clef, a 2-sharp key signature, and a 4/4 time signature. Measure 2
	// changes the key to 4 sharps — only the new key signature is redrawn at the
	// change (the clef and time signature are NOT repeated). Measure 3 continues in 4
	// sharps with no key signature redrawn. Each measure holds one C5 whole note.
	testCase('key_change.musicxml', 'key_change.png'),

	// One system, treble: a time signature change mid-system. Measure 1 opens the
	// system with a treble clef and a 4/4 time signature and holds four C5 quarter
	// notes. Measure 2 changes the meter to 3/4 — only the new time signature is
	// redrawn at the change (the clef is NOT repeated) — and holds three C5 quarter
	// notes. Measure 3 continues in 3/4 with no time signature redrawn, holding three
	// C5 quarter notes.
	testCase('time_change.musicxml', 'time_change.png'),

	// Beam variations across six 4/4 measures: (1) simple beamed eighths in a small
	// range; (2) beamed eighths leaping a wide range (steep beams, ledger lines above
	// on D6/E6 and below on C4/D4); (3) two double-beamed sixteenth groups then a half
	// rest; (4) one beat of triple-beamed 32nds then half + quarter rests; (5) mixed
	// eighth+sixteenth beats with partial secondary beams; (6) a beamed eighth group
	// spanning an internal eighth rest. Wraps across systems.
	testCase('beam_variations.musicxml', 'beam_variations.png'),

	// Treble stave, 4/4: four quarter-note chords — a C5/E5/G5 triad, a C5/D5 second
	// (offset noteheads), a C5/D5/E5 cluster, then a C5/E5/G5/A5 chord with a second
	// (G5/A5) on top.
	testCase('chord.musicxml', 'chord.png'),

	// Treble stave, 4/4: ledger lines on quarter notes and chords — a high C6 (two
	// ledger lines above), a middle C4 (one ledger line below), an A5/C6/E6 chord
	// above the staff, then a wide C4/C5/C6 chord spanning ledger lines above and
	// below.
	testCase('ledger_lines.musicxml', 'ledger_lines.png'),

	// Treble stave, 4/4, on C5: measure 1 two half notes tied within the measure;
	// measures 2–3 a whole note tied across the barline into the next whole note (the
	// tie arc spans the barline).
	testCase('tie.musicxml', 'tie.png'),

	// Slurs, with the quarter-note measures grouped first: (1) four quarters, slur
	// below (default); (2) four quarters, slur above; (3) four quarters carrying two
	// separate two-note slurs; (4) eight beamed eighths under one slur; (5) two half
	// notes slurred across a wide leap. Wraps across systems.
	testCase('slur.musicxml', 'slur.png'),

	// Tuplets on C5: measure 1 a beamed eighth-note triplet ("3"), a bracketed
	// quarter-note triplet ("3"), then a plain quarter; measure 2 a beamed
	// sixteenth-note sextuplet ("6"), a beamed eighth-note triplet ("3"), then a half
	// note.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — staccato (dot),
	// accent (>), tenuto (—), then staccatissimo (wedge) — so only the articulation
	// varies.
	testCase('articulations.musicxml', 'articulations.png'),

	// Treble stave, 4/4: two voices sharing one stave — voice 1 (stems up) a mixed
	// quarter/eighth line spanning the whole measure; voice 2 (stems down) a distinct
	// lower line that is silent on beats 1 and 4 via <forward> (no rests drawn). The
	// silence is held open by invisible ghost tickables (src/stave-notes.ts), so voice 2
	// starts aligned on beat 2 (G4 under voice 1's F5) and its last note (G4 on beat 3.5)
	// keeps a full beat of space to its right before voice 1's final C5 on beat 4 —
	// rather than being crammed against it.
	testCase('two_voices.musicxml', 'two_voices.png'),

	// Eight identical C5 whole-note measures wrapping onto two systems of four measures
	// each (default layout).
	testCase('system_break.musicxml', 'system_break.png'),

	// The same eight C5 whole-note measures, but with panoramic layout: all eight sit
	// on a single uninterrupted system (no system break).
	testCase('system_break.musicxml', 'layout_panoramic.png', {
		layout: { type: 'panoramic' },
	}),
];

for (const t of TEST_CASES) {
	test(t.screenshotFilename, async () => {
		const png = await render(t.musicXMLFilename, t.renderOptions);
		expect(png).toMatchScreenshot(t.screenshotFilename);
	});
}
