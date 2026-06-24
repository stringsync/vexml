import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { testCase } from '../testing/test-case';

const TEST_CASES = [
	testCase('structure_single_stave.musicxml', {}),
	testCase('structure_grand_staff.musicxml', {}),
	testCase('structure_two_parts.musicxml', {}),
	testCase('structure_mixed_staves.musicxml', {}),
	testCase('clef_treble.musicxml', {}),
	testCase('clef_treble_bass.musicxml', {}),
	testCase('clef_tab_6_string.musicxml', {}),
	testCase('clef_tab_4_string.musicxml', {}),

	// Combined notation + tablature (treble stave over a 6-string TAB stave).
	testCase('clef_notation_and_tab.musicxml', {}),

	// Finish the measure header (<attributes>): key signatures, then time signatures.
	testCase('key_sharps.musicxml', {}),
	testCase('key_flats.musicxml', {}),
	testCase('time_numeric.musicxml', {}),
	testCase('time_common.musicxml', {}),
	testCase('time_cut.musicxml', {}),

	// First note content on the staff.
	testCase('note_whole.musicxml', {}),
	testCase('note_durations.musicxml', {}),
	testCase('rest.musicxml', {}),
	testCase('accidentals.musicxml', {}),

	// Horizontal layout across measures.
	testCase('measures_two.musicxml', {}),

	// Note engraving beyond single noteheads.
	testCase('beam_eighths.musicxml', {}), // beam flagged notes together
	testCase('dotted_notes.musicxml', {}), // augmentation dots
	testCase('chord.musicxml', {}), // stacked noteheads on one stem
	testCase('ledger_lines.musicxml', {}), // pitches above/below the staff

	// Connectors and groupings spanning notes.
	testCase('tie.musicxml', {}), // tie between same-pitch notes
	testCase('slur.musicxml', {}), // slur across different pitches
	testCase('tuplet_triplet.musicxml', {}), // triplet bracket + number

	// Markings attached to notes.
	testCase('articulations.musicxml', {}), // staccato, accent
	testCase('two_voices.musicxml', {}), // two voices sharing one stave

	// Vertical layout: wrap measures onto multiple systems.
	testCase('system_break.musicxml', {}),

	// Consistent spacing across a long single-part piece (chromatic scale).
	testCase('tmp_pitches.musicxml', {}),
];

for (const { filename, screenshot, renderOptions } of TEST_CASES) {
	test(screenshot, async () => {
		const png = await render(filename, renderOptions);
		expect(png).toMatchScreenshot(screenshot);
	});
}
