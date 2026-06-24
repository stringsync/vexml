export function it(filename: string) {
	if (!filename.endsWith('.musicxml')) {
		throw new Error(`Expected musicxml to end with .musicxml, got ${filename}`);
	}
	const baseline = filename.replace(/\.musicxml$/, '');
	return { filename, baseline };
}
