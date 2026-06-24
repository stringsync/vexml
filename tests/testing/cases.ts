export const WIDTHS = { desktop: 900, mobile: 375 };

export function testCase(name: string, width: number, musicxml: string) {
	return { name, width, musicxml, baseline: `${name}_${width}px` };
}
