import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { it, WIDTHS } from '../testing/it';

const TEST_CASES = [
	it(
		'should render a single part with a single stave',
		'one_part_one_stave.musicxml',
		WIDTHS.mobile,
	),
	it(
		'should render a single part with two staves connected by a brace',
		'one_part_two_staves.musicxml',
		WIDTHS.mobile,
	),
	it(
		'should render two parts, each with a single stave',
		'two_parts_one_stave.musicxml',
		WIDTHS.mobile,
	),
	it(
		'should render two parts, one with a single stave and one with two staves',
		'two_parts_mixed_staves.musicxml',
		WIDTHS.mobile,
	),
	it(
		'should render a treble clef',
		'one_part_one_stave_treble_clef.musicxml',
		WIDTHS.mobile,
	),
	it(
		'should render a treble and bass clef',
		'one_part_two_staves_treble_bass_clefs.musicxml',
		WIDTHS.mobile,
	),
];

for (const { name, width, filename, baseline } of TEST_CASES) {
	test(`${name} (${baseline})`, async () => {
		const png = await render(filename, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
