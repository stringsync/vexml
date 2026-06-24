import type { Layout, RenderOptions } from '../../src';

const encodeLayout = (layout: Layout): string =>
	layout.type === 'standard'
		? `layout-standard-${layout.width}`
		: 'layout-panoramic';

export function testCase(filename: string, renderOptions: RenderOptions) {
	if (!filename.endsWith('.musicxml')) {
		throw new Error(`Expected filename to end with .musicxml, got ${filename}`);
	}
	const basename = filename.replace(/\.musicxml$/, '');
	// Encode the render options into the screenshot name so cases differing only by
	// options get distinct baselines. Sorted for a stable name regardless of key order.
	const suffix = Object.entries(renderOptions)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) =>
			key === 'layout' ? encodeLayout(value as Layout) : `${key}-${value}`,
		)
		.join('_');
	const screenshot = suffix ? `${basename}__${suffix}.png` : `${basename}.png`;
	return { filename, screenshot, renderOptions };
}
