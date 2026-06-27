import type { Config } from '../../src';

export function testCase(
	musicXMLFilename: string,
	screenshotFilename: string,
	config: Partial<Config> = {},
) {
	if (!musicXMLFilename.endsWith('.musicxml')) {
		throw new Error(
			`Expected musicXMLFilename to end with .musicxml, got ${musicXMLFilename}`,
		);
	}
	if (!screenshotFilename.endsWith('.png')) {
		throw new Error(
			`Expected screenshotFilename to end with .png, got ${screenshotFilename}`,
		);
	}
	return {
		musicXMLFilename,
		screenshotFilename,
		config,
	};
}
