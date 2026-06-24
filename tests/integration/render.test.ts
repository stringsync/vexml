import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { it } from '../testing/it';

const TEST_CASES = [
	it('10_structure_single_stave.musicxml'),
	it('20_structure_grand_staff.musicxml'),
	it('30_structure_two_parts.musicxml'),
	it('40_structure_mixed_staves.musicxml'),
	it('50_clef_treble.musicxml'),
	it('60_clef_treble_bass.musicxml'),
	it('70_clef_tab_6_string.musicxml'),
	it('80_clef_tab_4_string.musicxml'),

	// Combined notation + tablature (treble stave over a 6-string TAB stave).
	it('90_clef_notation_and_tab.musicxml'),

	// Finish the measure header (<attributes>): key signatures, then time signatures.
	it('100_key_sharps.musicxml'),
	it('110_key_flats.musicxml'),
	it('120_time_numeric.musicxml'),
	it('130_time_common.musicxml'),
	it('140_time_cut.musicxml'),

	// First note content on the staff.
	it('150_note_whole.musicxml'),
	it('160_note_durations.musicxml'),
	it('170_rest.musicxml'),
	it('180_accidentals.musicxml'),

	// Horizontal layout across measures.
	it('190_measures_two.musicxml'),

	// Note engraving beyond single noteheads.
	it('200_beam_eighths.musicxml'), // beam flagged notes together
	it('210_dotted_notes.musicxml'), // augmentation dots
	it('220_chord.musicxml'), // stacked noteheads on one stem
	it('230_ledger_lines.musicxml'), // pitches above/below the staff

	// Connectors and groupings spanning notes.
	it('240_tie.musicxml'), // tie between same-pitch notes
	it('250_slur.musicxml'), // slur across different pitches
	it('260_tuplet_triplet.musicxml'), // triplet bracket + number

	// Markings attached to notes.
	it('270_articulations.musicxml'), // staccato, accent
	it('280_two_voices.musicxml'), // two voices sharing one stave

	// Vertical layout: wrap measures onto multiple systems.
	it('290_system_break.musicxml'),

	// Consistent spacing across a long single-part piece (chromatic scale).
	it('300_tmp_pitches.musicxml'),
];

for (const { filename, baseline } of TEST_CASES) {
	test(baseline, async () => {
		const png = await render(filename);
		expect(png).toMatchBaseline(baseline);
	});
}
