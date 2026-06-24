import { expect, test } from 'bun:test';
import { render } from '../testing/harness';
import { it, WIDTHS } from '../testing/it';

const TEST_CASES = [
	// TODO: This test renders four quarter notes, but it shouldn't.
	it('should render an empty score', 'empty.musicxml', WIDTHS.mobile),
];

for (const { name, width, filename, baseline } of TEST_CASES) {
	test(`${name} (${width}px)`, async () => {
		const png = await render(filename, { width });
		expect(png).toMatchBaseline(baseline);
	});
}
