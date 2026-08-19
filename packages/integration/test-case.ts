import type { ConfigInput } from '@stringsync/vexml';

export function testCase(
	musicXMLFilename: string,
	screenshotFilename: string,
	config: ConfigInput = {},
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
