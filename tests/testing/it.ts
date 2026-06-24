export const WIDTHS = { desktop: 900, mobile: 375 };

export function it(name: string, filename: string, width: number) {
	if (!filename.endsWith('.musicxml')) {
		throw new Error(`Expected musicxml to end with .musicxml, got ${filename}`);
	}
	const baseline = `${filename.replace(/\.musicxml$/, '')}_${width}px`;
	return { name, width, filename, baseline };
}
