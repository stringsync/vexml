import { describe, expect, it } from 'bun:test';
import { TEST_URL, testBrowser } from '../testing/setup';

describe('cursor', () => {
	// A playback cursor end to end, the way a caller reaches it: render, add a cursor, attach the
	// built-in bar view, and seek. Proves the timeline builds from a real score and the bar lands on the
	// engraving at the sought time. The timeline/cursor/view logic is unit-tested in src/*; this is the
	// integration screenshot. Uses the run's shared browser/server (see setup.ts).
	it('a playback cursor draws its bar on the score at the sought time', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 400 },
		});
		try {
			await page.goto(TEST_URL);
			await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (await fetch('/data/arpeggio.musicxml')).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
				// Seek 40% through the piece — a deterministic spot independent of the note count.
				cursor.seekMs(score.getDurationMs() * 0.4);
			});
			const buf = await page.locator('#screenshot').screenshot();
			expect(buf).toMatchScreenshot('cursor_bar.png');
		} finally {
			await page.close();
		}
	}, 30_000);

	// Coloring the highlighted notes of a tied tab chord must not stamp phantom blips on the tab
	// staff. A tie-stop string re-uses the struck note's fret, so guitar convention omits its
	// number — its tab Note carries no glyph. Seek 30% in, into the eighth-note re-articulation of
	// the tied chord (strings 1 & 2), then color everything the cursor highlights: the drawn frets
	// recolor, and the two number-less tied strings draw nothing (no filled-ellipse blip).
	it('a tied tab chord colors its drawn frets but not the number-less tied strings', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 500 },
		});
		try {
			await page.goto(TEST_URL);
			await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (
					await fetch('/data/aloof_measure_2.musicxml')
				).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
				cursor.addEventListener('change', (e) => {
					for (const n of e.highlighted) {
						n.color.on('#155dfc');
					}
				});
				cursor.seekMs(score.getDurationMs() * 0.3);
			});
			const buf = await page.locator('#screenshot').screenshot();
			expect(buf).toMatchScreenshot('cursor_tab_tie.png');
		} finally {
			await page.close();
		}
	}, 30_000);

	// A chord diagram (a <harmony> <frame>) floats well above the stave, but the playback bar must not
	// reach up to it: the bar should span only the stave region — here a treble + 6-line TAB grand staff
	// — as if the diagram weren't there. Seek 40% in (mid first measure) so the bar lands between notes.
	it('the playback bar spans the stave, not up to a chord diagram', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 500, height: 400 },
		});
		try {
			await page.goto(TEST_URL);
			await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (
					await fetch('/data/chord_diagram_tab.musicxml')
				).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
				cursor.seekMs(score.getDurationMs() * 0.4);
			});
			const buf = await page.locator('#screenshot').screenshot();
			expect(buf).toMatchScreenshot('cursor_chord_diagram.png');
		} finally {
			await page.close();
		}
	}, 30_000);

	// Grace notes aren't tickables, so they never enter the timeline — but they must still be reachable
	// as Note targets (with real engraved geometry) so the player can sound and light them. Walk the
	// cursor over every onset and collect the grace notes attached to each started note.
	it('grace notes resolve to targets with real geometry off their host onsets', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 400 },
		});
		try {
			await page.goto(TEST_URL);
			const graces = await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (await fetch('/data/grace_notes.musicxml')).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				const found: Array<{ pitch: string | null; x: number; w: number }> = [];
				cursor.addEventListener('change', (e) => {
					for (const n of e.started) {
						for (const g of n.getGraceNotes()) {
							found.push({ pitch: g.getPitch(), x: g.rect.x, w: g.rect.w });
						}
					}
				});
				const duration = score.getDurationMs();
				for (let t = 0; t <= duration; t += duration / 200) {
					cursor.seekMs(t);
				}
				return found;
			});
			// The fixture puts a grace before several notes; each must resolve with a sounding pitch and a
			// real, non-degenerate notehead box (not the near-origin bogus group box).
			expect(graces.length).toBeGreaterThan(0);
			for (const g of graces) {
				expect(g.pitch).not.toBeNull();
				expect(g.w).toBeGreaterThan(0);
				expect(g.x).toBeGreaterThan(10);
			}
		} finally {
			await page.close();
		}
	}, 30_000);

	// A tab grace note must also be a real target so it colors in step with its notation grace: its
	// fret (TabPosition) carries the engraved glyph the color overlay recolors.
	it('tab grace notes resolve to fret targets with real geometry', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 400 },
		});
		try {
			await page.goto(TEST_URL);
			const graces = await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (await fetch('/data/tab_grace.musicxml')).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				const found: Array<{ hasFret: boolean; x: number; w: number }> = [];
				cursor.addEventListener('change', (e) => {
					for (const n of e.started) {
						for (const g of n.getGraceNotes()) {
							found.push({
								hasFret: g.getTabPosition() !== null,
								x: g.rect.x,
								w: g.rect.w,
							});
						}
					}
				});
				const duration = score.getDurationMs();
				for (let t = 0; t <= duration; t += duration / 200) {
					cursor.seekMs(t);
				}
				return found;
			});
			// Each grace resolves to a target whose fret glyph (TabPosition) is laid out at a real x.
			expect(graces.length).toBeGreaterThan(0);
			for (const g of graces) {
				expect(g.hasFret).toBe(true);
				expect(g.w).toBeGreaterThan(0);
				expect(g.x).toBeGreaterThan(10);
			}
		} finally {
			await page.close();
		}
	}, 30_000);

	// A tied chord must light every member of the whole tie group while any of it sounds — mdom pairs
	// a chord's ties by shared number, so the timeline re-resolves each to its same-pitch member. Seek
	// into the 2nd (tied-to) chord; all four noteheads (both chords, C5 + E5 each) must be highlighted,
	// and nothing once playback is done.
	it('a tied chord highlights every member of the tie group', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 400 },
		});
		try {
			await page.goto(TEST_URL);
			const result = await page.evaluate(async () => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (await fetch('/data/tie_chord_dyad.musicxml')).text();
				const score = await window.render(xml, container, {});
				const cursor = score.createCursor();
				const dur = score.getDurationMs();
				cursor.seekMs(dur * 0.75); // within the 2nd chord's step
				const sounding = cursor
					.getHighlightedElements()
					.map((n) => n.getPitch())
					.sort();
				cursor.seekMs(dur); // done
				return { sounding, whenDone: cursor.getHighlightedElements().length };
			});
			expect(result.sounding).toEqual(['C/5', 'C/5', 'E/5', 'E/5']);
			expect(result.whenDone).toBe(0);
		} finally {
			await page.close();
		}
	}, 30_000);
});
