import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { testCase } from '../testing/test-case';

const TEST_CASES = [
	// Bare structure: just staff lines, no clefs or notes.

	// A single empty 5-line stave: staff lines and a barline, nothing else.
	testCase('structure_single_stave.musicxml', 'structure_single_stave.png'),
	// One part with two empty staves joined by a curly brace (grand staff).
	testCase('structure_grand_staff.musicxml', 'structure_grand_staff.png'),
	// Two separate single-stave parts stacked vertically, with no connecting brace.
	testCase('structure_two_parts.musicxml', 'structure_two_parts.png'),
	// A single-stave part above a two-stave (braced) part — mixed stave counts.
	testCase('structure_mixed_staves.musicxml', 'structure_mixed_staves.png'),

	// Clefs.

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

	// Rest of the measure header (<attributes>): key signatures, then time signatures.

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

	// First note content on the staff.

	// Treble stave, 4/4: a single whole note (G4) at the start of the measure.
	testCase('note_whole.musicxml', 'note_whole.png'),
	// Treble stave, 4/4: four notes on G4 — half, quarter, then two unbeamed flagged eighths.
	testCase('note_durations.musicxml', 'note_durations.png'),
	// Treble stave, 4/4: a half note followed by a half rest sitting on the middle line.
	testCase('rest.musicxml', 'rest.png'),
	// Treble stave, 4/4: quarter notes with a sharp (C#5), flat (Eb5), and natural (C5), then an unaltered G4.
	testCase('accidentals.musicxml', 'accidentals.png'),

	// Horizontal layout across measures.

	// Treble stave, 4/4: two measures split by a barline, each holding one whole note.
	testCase('measures_two.musicxml', 'measures_two.png'),

	// Note engraving beyond single noteheads.

	// Treble stave, 4/4: two groups of four beamed eighths leaping across a wide range (slanted beams, ledger lines on the high notes).
	testCase('beam_eighths.musicxml', 'beam_eighths.png'),
	// Treble stave, 4/4: two dotted-quarter + eighth pairs, augmentation dots after the dotted quarters.
	testCase('dotted_notes.musicxml', 'dotted_notes.png'),
	// Treble stave, 4/4: a single whole-note chord stacking C5/E5/G5 noteheads.
	testCase('chord.musicxml', 'chord.png'),
	// Treble stave, 4/4: a high C6 (ledger lines above) and a middle C4 (one ledger line below).
	testCase('ledger_lines.musicxml', 'ledger_lines.png'),

	// Connectors and groupings spanning notes.

	// Treble stave, 4/4: two same-pitch half notes (C5) joined by a tie arc.
	testCase('tie.musicxml', 'tie.png'),
	// Slur arcs over phrases across several measures, placed both above and below the notes, wrapping onto a second system.
	testCase('slur.musicxml', 'slur.png'),
	// Treble stave, 4/4: a beamed eighth-note triplet bracketed with a "3", then three quarter notes.
	testCase('tuplet_triplet.musicxml', 'tuplet_triplet.png'),

	// Markings attached to notes.

	// Treble stave, 4/4: four quarter notes marked staccato (dot), accent (>), tenuto (—), and staccatissimo (wedge).
	testCase('articulations.musicxml', 'articulations.png'),
	// Treble stave, 4/4: two voices sharing one stave — an upper whole note (C5) and a lower whole note (E4).
	testCase('two_voices.musicxml', 'two_voices.png'),

	// Vertical layout: wrap measures onto multiple systems.

	// Eight whole-note measures wrapping onto two systems of four measures each (the line rises C5–G5 then falls back).
	testCase('system_break.musicxml', 'system_break.png'),

	// Consistent spacing across a long single-part piece.

	// A long single-part chromatic exercise spanning a wide range with ledger lines, sharps, flats, and double accidentals, wrapping across many systems.
	testCase('tmp_pitches.musicxml', 'tmp_pitches.png'),
];

for (const t of TEST_CASES) {
	test(t.screenshotFilename, async () => {
		const png = await render(t.musicXMLFilename, t.renderOptions);
		expect(png).toMatchScreenshot(t.screenshotFilename);
	});
}
