import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { it, WIDTHS } from '../testing/it';

const TEST_CASES = [
	it('should render an empty score', 'empty.musicxml', WIDTHS.mobile),
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
];

for (const { name, width, filename, baseline } of TEST_CASES) {
	test(`${name} (${width}px)`, async () => {
		const png = await render(filename, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
