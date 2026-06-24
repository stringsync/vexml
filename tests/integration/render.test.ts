import { expect, test } from 'bun:test';
import { render } from './harness';
import './matcher';

const WIDTHS = { desktop: 900, mobile: 375 };

function testCase(name: string, width: number, musicxml: string) {
	return { name, width, musicxml, baseline: `${name}_${width}px` };
}

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
