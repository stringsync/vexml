import { expect, test } from 'bun:test';
import { TEST_URL, testBrowser } from '../testing/setup';

// A playback cursor end to end, the way a caller reaches it: render, add a cursor, attach the
// built-in bar view, and seek. Proves the timeline builds from a real score and the bar lands on the
// engraving at the sought time. The timeline/cursor/view logic is unit-tested in src/*; this is the
// integration screenshot. Uses the run's shared browser/server (see setup.ts).
test('a playback cursor draws its bar on the score at the sought time', async () => {
	const browser = await testBrowser();
	const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
	try {
		await page.goto(TEST_URL);
		await page.evaluate(async () => {
			const container = document.getElementById('screenshot');
			if (!(container instanceof HTMLDivElement)) {
				throw new Error('container not found');
			}
			const xml = await (await fetch('/data/arpeggio.musicxml')).text();
			const score = await window.render(xml, container, {});
			const cursor = score.addCursor();
			cursor.attach(score.createCursorView({ color: '#2962ff', widthPx: 3 }));
			// Seek 40% through the piece — a deterministic spot independent of the note count.
			cursor.seekMs(score.getDurationMs() * 0.4);
		});
		const buf = await page.locator('#screenshot').screenshot();
		expect(buf).toMatchScreenshot('cursor_bar.png');
	} finally {
		await page.close();
	}
}, 30_000);
