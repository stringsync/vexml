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

	// Grand staff: treble clef on the upper stave, bass clef on the lower, joined by a brace.
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

	// Treble stave, 4/4: note durations on C5 — measure 1 a whole note; measure 2 a half, quarter, eighth, sixteenth, then two thirty-seconds (increasing flag counts).
	testCase('note_durations.musicxml', 'note_durations.png'),

	// Treble stave, 4/4, all on C5: measure 1 dotted-quarter + eighth pairs (single dots); measure 2 double-dotted-quarter + sixteenth pairs (double dots); measure 3 four beamed dotted-eighth + sixteenth pairs (dots inside beams).
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),

	// Treble stave, 4/4: the rest counterpart of note_durations — measure 1 a whole rest; measure 2 half, quarter, eighth, sixteenth, then two thirty-second rests.
	testCase('rest.musicxml', 'rest.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — sharp, flat, natural, then no accidental — so only the accidental glyph varies.
	testCase('accidentals.musicxml', 'accidentals.png'),

	// Treble stave, 4/4: two measures split by a barline, each holding one whole note (C5, same pitch in both).
	testCase('measures_two.musicxml', 'measures_two.png'),

	// TODO: False positive — the mid-system key change is NOT rendered. The accepted baseline shows measures 2-3 as bare C5 whole notes with no 4-sharp key signature at the change point (measure 2). Expected: the new 4-sharp key signature is redrawn at the start of measure 2 (without repeating the clef or time signature). This is a mid-system key-change rendering gap in src/. Fix it, then run `vex test key_change --update` once the new key signature appears at measure 2.
	// One system, treble 4/4: a key change mid-system. Measure 1 opens the system with a treble clef, a 2-sharp key signature, and a 4/4 time signature. Measure 2 changes the key to 4 sharps — only the new key signature is redrawn at the change (the clef and time signature are NOT repeated). Measure 3 continues in 4 sharps with no key signature redrawn. Each measure holds one C5 whole note.
	testCase('key_change.musicxml', 'key_change.png'),

	// TODO: False positive — the mid-system time change is NOT rendered. The accepted baseline shows measures 2-3 with three C5 quarter notes but no 3/4 time signature at the change point (measure 2); the meter is applied to layout (correct 4/3/3 beat counts) but the time-signature glyph is not redrawn. Expected: the new 3/4 time signature is drawn at the start of measure 2 (without repeating the clef). This is a mid-system time-change rendering gap in src/ (same family as the key_change gap). Fix it, then run `vex test time_change --update` once the 3/4 appears at measure 2.
	// One system, treble: a time signature change mid-system. Measure 1 opens the system with a treble clef and a 4/4 time signature and holds four C5 quarter notes. Measure 2 changes the meter to 3/4 — only the new time signature is redrawn at the change (the clef is NOT repeated) — and holds three C5 quarter notes. Measure 3 continues in 3/4 with no time signature redrawn, holding three C5 quarter notes.
	testCase('time_change.musicxml', 'time_change.png'),

	// Beam variations across six 4/4 measures: (1) simple beamed eighths in a small range; (2) beamed eighths leaping a wide range (steep beams, ledger lines above on D6/E6 and below on C4/D4); (3) two double-beamed sixteenth groups then a half rest; (4) one beat of triple-beamed 32nds then half + quarter rests; (5) mixed eighth+sixteenth beats with partial secondary beams; (6) a beamed eighth group spanning an internal eighth rest. Wraps across systems.
	testCase('beam_variations.musicxml', 'beam_variations.png'),

	// Treble stave, 4/4: four quarter-note chords — a C5/E5/G5 triad, a C5/D5 second (offset noteheads), a C5/D5/E5 cluster, then a C5/E5/G5/A5 chord with a second (G5/A5) on top.
	testCase('chord.musicxml', 'chord.png'),

	// Treble stave, 4/4: ledger lines on quarter notes and chords — a high C6 (two ledger lines above), a middle C4 (one ledger line below), an A5/C6/E6 chord above the staff, then a wide C4/C5/C6 chord spanning ledger lines above and below.
	testCase('ledger_lines.musicxml', 'ledger_lines.png'),

	// TODO: False positive — the cross-barline tie (measures 2–3) does NOT render: the accepted baseline shows two C5 whole notes with no connecting tie arc, even though the MusicXML has tie/tied start on measure 2 and stop on measure 3. The intra-measure tie in measure 1 (same encoding) renders correctly, so this is a cross-measure tie rendering gap in src/. Fix it, then run `vex test tie --update` once the arc appears across the barline.
	// Treble stave, 4/4, on C5: measure 1 two half notes tied within the measure; measures 2–3 a whole note tied across the barline into the next whole note.
	testCase('tie.musicxml', 'tie.png'),

	// Slurs, with the quarter-note measures grouped first: (1) four quarters, slur below (default); (2) four quarters, slur above; (3) four quarters carrying two separate two-note slurs; (4) eight beamed eighths under one slur; (5) two half notes slurred across a wide leap. Wraps across systems.
	testCase('slur.musicxml', 'slur.png'),

	// Tuplets on C5: measure 1 a beamed eighth-note triplet ("3"), a bracketed quarter-note triplet ("3"), then a plain quarter; measure 2 a beamed sixteenth-note sextuplet ("6"), a beamed eighth-note triplet ("3"), then a half note.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// Treble stave, 4/4: four C5 quarter notes at one staff position — staccato (dot), accent (>), tenuto (—), then staccatissimo (wedge) — so only the articulation varies.
	testCase('articulations.musicxml', 'articulations.png'),

	// Treble stave, 4/4: two voices sharing one stave — voice 1 (stems up) a mixed quarter/eighth line spanning the measure; voice 2 (stems down) a distinct lower line that rests on beats 1 and 4, so it starts and ends inside voice 1.
	testCase('two_voices.musicxml', 'two_voices.png'),

	// Eight identical C5 whole-note measures wrapping onto two systems of four measures each (default layout).
	testCase('system_break.musicxml', 'system_break.png'),

	// The same eight C5 whole-note measures, but with panoramic layout: all eight sit on a single uninterrupted system (no system break).
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
