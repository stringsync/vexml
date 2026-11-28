import { describe, expect, it } from 'bun:test';
import { draw } from './engraving-render';

describe('Behind Bars single-line spoken rhythm (p. 457)', () => {
	it.concurrent('draws narrator spoken rhythms on a single-line stave', async () => {
		expect(await draw('vocal-speech-single-line')).toMatchScreenshot(
			'engraving_vocal-speech-single-line.png',
		);
	});

	// fix: #4731
	it.todo('vocal-spoken-single-line (p. 457): noteheads on line, stems up');
});
