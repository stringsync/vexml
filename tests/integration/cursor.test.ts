import { describe, expect, it } from 'bun:test';
import { renderTest } from '../testing/harness';

describe('cursor', () => {
	// A playback cursor end to end, the way a caller reaches it: render, add a cursor, attach the
	// built-in bar view, and seek. Proves the timeline builds from a real score and the bar lands on the
	// engraving at the sought time. The timeline/cursor/view logic is unit-tested in src/*; this is the
	// integration screenshot.
	it.concurrent('a playback cursor draws its bar on the score at the sought time', async () => {
		const { png } = await renderTest('arpeggio.musicxml', {}, (score) => {
			const cursor = score.createCursor();
			cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
			// Seek 40% through the piece — a deterministic spot independent of the note count.
			cursor.seekMs(score.getDurationMs() * 0.4);
		});
		expect(png).toMatchScreenshot('cursor_bar.png');
	});

	// Coloring the highlighted notes of a tied tab chord must not stamp phantom blips on the tab
	// staff. A tie-stop string re-uses the struck note's fret, so guitar convention omits its
	// number — its tab Note carries no glyph. Seek 30% in, into the eighth-note re-articulation of
	// the tied chord (strings 1 & 2), then color everything the cursor highlights: the drawn frets
	// recolor, and the two number-less tied strings draw nothing (no filled-ellipse blip).
	it.concurrent('a tied tab chord colors its drawn frets but not the number-less tied strings', async () => {
		const { png } = await renderTest(
			'aloof_measure_2.musicxml',
			{},
			(score) => {
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
				cursor.addEventListener('change', (e) => {
					for (const n of e.highlighted) {
						n.color.on('#155dfc');
					}
				});
				cursor.seekMs(score.getDurationMs() * 0.3);
			},
		);
		expect(png).toMatchScreenshot('cursor_tab_tie.png');
	});

	// A chord diagram (a <harmony> <frame>) floats well above the stave, but the playback bar must not
	// reach up to it: the bar should span only the stave region — here a treble + 6-line TAB grand staff
	// — as if the diagram weren't there. Seek 40% in (mid first measure) so the bar lands between notes.
	it.concurrent('the playback bar spans the stave, not up to a chord diagram', async () => {
		const { png } = await renderTest(
			'chord_diagram_tab.musicxml',
			{},
			(score) => {
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
				cursor.seekMs(score.getDurationMs() * 0.4);
			},
		);
		expect(png).toMatchScreenshot('cursor_chord_diagram.png');
	});

	// Grace notes aren't tickables, so they never enter the timeline — but they must still be reachable
	// as Note targets (with real engraved geometry) so the player can sound and light them. Walk the
	// cursor over every onset and collect the grace notes attached to each started note.
	it.concurrent('grace notes resolve to targets with real geometry off their host onsets', async () => {
		const { result: graces } = await renderTest(
			'grace_notes.musicxml',
			{},
			(score) => {
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
			},
		);
		// The fixture puts a grace before several notes; each must resolve with a sounding pitch and a
		// real, non-degenerate notehead box (not the near-origin bogus group box).
		expect(graces.length).toBeGreaterThan(0);
		for (const g of graces) {
			expect(g.pitch).not.toBeNull();
			expect(g.w).toBeGreaterThan(0);
			expect(g.x).toBeGreaterThan(10);
		}
	});

	// A tab grace note must also be a real target so it colors in step with its notation grace: its
	// fret (TabPosition) carries the engraved glyph the color overlay recolors.
	it.concurrent('tab grace notes resolve to fret targets with real geometry', async () => {
		const { result: graces } = await renderTest(
			'tab_grace.musicxml',
			{},
			(score) => {
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
			},
		);
		// Each grace resolves to a target whose fret glyph (TabPosition) is laid out at a real x.
		expect(graces.length).toBeGreaterThan(0);
		for (const g of graces) {
			expect(g.hasFret).toBe(true);
			expect(g.w).toBeGreaterThan(0);
			expect(g.x).toBeGreaterThan(10);
		}
	});

	// A tied chord must light every member of the whole tie group while any of it sounds — mdom pairs
	// a chord's ties by shared number, so the timeline re-resolves each to its same-pitch member. Seek
	// into the 2nd (tied-to) chord; all four noteheads (both chords, C5 + E5 each) must be highlighted,
	// and nothing once playback is done.
	it.concurrent('a tied chord highlights every member of the tie group', async () => {
		const { result } = await renderTest(
			'tie_chord_dyad.musicxml',
			{},
			(score) => {
				const cursor = score.createCursor();
				const dur = score.getDurationMs();
				cursor.seekMs(dur * 0.75); // within the 2nd chord's step
				const sounding = cursor
					.getHighlightedElements()
					.map((n) => n.getPitch())
					.sort();
				cursor.seekMs(dur); // done
				return { sounding, whenDone: cursor.getHighlightedElements().length };
			},
		);
		expect(result.sounding).toEqual(['C/5', 'C/5', 'E/5', 'E/5']);
		expect(result.whenDone).toBe(0);
	});
});
