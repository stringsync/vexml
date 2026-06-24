import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import '../testing/matcher';
import { testCase, WIDTHS } from '../testing/cases';

const TEST_CASES = [
	testCase('empty', WIDTHS.mobile, 'empty.musicxml'),
	testCase('quarter_notes', WIDTHS.mobile, 'quarter_notes.musicxml'),
];

for (const { name, width, musicxml, baseline } of TEST_CASES) {
	test(`${name} (${width}px)`, async () => {
		const png = await render(musicxml, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
