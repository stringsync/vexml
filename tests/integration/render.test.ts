import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { it, WIDTHS } from '../testing/it';

const TEST_CASES = [
	it('10_structure_single_stave.musicxml', WIDTHS.mobile),
	it('20_structure_grand_staff.musicxml', WIDTHS.mobile),
	it('30_structure_two_parts.musicxml', WIDTHS.mobile),
	it('40_structure_mixed_staves.musicxml', WIDTHS.mobile),
	it('50_clef_treble.musicxml', WIDTHS.mobile),
	it('60_clef_treble_bass.musicxml', WIDTHS.mobile),
	it('70_clef_tab_6_string.musicxml', WIDTHS.mobile),
	it('80_clef_tab_4_string.musicxml', WIDTHS.mobile),

	// --- Roadmap: implement top-to-bottom, one at a time. ---

	// Combined notation + tablature (treble stave over a 6-string TAB stave).
	// it('90_clef_notation_and_tab.musicxml', WIDTHS.mobile),

	// Finish the measure header (<attributes>): key signatures, then time signatures.
	// it('100_key_sharps.musicxml', WIDTHS.mobile),
	// it('110_key_flats.musicxml', WIDTHS.mobile),
	// it('120_time_numeric.musicxml', WIDTHS.mobile),
	// it('130_time_common.musicxml', WIDTHS.mobile),
	// it('140_time_cut.musicxml', WIDTHS.mobile),

	// First note content on the staff.
	// it('150_note_whole.musicxml', WIDTHS.mobile),
	// it('160_note_durations.musicxml', WIDTHS.mobile),
	// it('170_rest.musicxml', WIDTHS.mobile),
	// it('180_accidentals.musicxml', WIDTHS.mobile),

	// Horizontal layout across measures.
	// it('190_measures_two.musicxml', WIDTHS.mobile),
];

for (const { width, filename, baseline } of TEST_CASES) {
	test(baseline, async () => {
		const png = await render(filename, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
