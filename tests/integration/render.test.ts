import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import '../testing/matcher';
import { testCase, WIDTHS } from '../testing/cases';

const TEST_CASES = [
	testCase('empty', 'empty.musicxml', WIDTHS.mobile),
	testCase('quarter_notes', 'quarter_notes.musicxml', WIDTHS.mobile),
];

for (const { name, width, musicxml, baseline } of TEST_CASES) {
	test(`${name} (${width}px)`, async () => {
		const png = await render(musicxml, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
