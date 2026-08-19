import { describe, expect, it } from 'bun:test';
import { renderTest } from '../testing/harness';

describe('cursor', () => {
	// A playback cursor end to end, the way a caller reaches it: render, add a cursor, attach the
	// built-in bar view, and seek. Proves the timeline builds from a real score and the bar lands on the
	// engraving at the sought time. The timeline/cursor/view logic is unit-tested in src/*; this is the
	// integration screenshot.
	it.concurrent('a playback cursor draws its bar on the score at the sought time', async () => {
		const { png } = await renderTest(
			'arpeggio.musicxml',
			{},
			{
				fn: (score) => {
					const cursor = score.createCursor();
					cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
					// Seek 40% through the piece — a deterministic spot independent of the note count.
					cursor.seekMs(score.getDurationMs() * 0.4);
				},
			},
		);
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
			{
				fn: (score) => {
					const cursor = score.createCursor();
					cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
					cursor.events.on('change', (e) => {
						for (const n of e.highlighted) {
							n.color.on('#155dfc');
						}
					});
					cursor.seekMs(score.getDurationMs() * 0.3);
				},
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
			{
				fn: (score) => {
					const cursor = score.createCursor();
					cursor.sync(score.createPlayhead({ color: '#2962ff', widthPx: 3 }));
					cursor.seekMs(score.getDurationMs() * 0.4);
				},
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
			{
				fn: (score) => {
					const cursor = score.createCursor();
					const found: Array<{ pitch: string | null; x: number; w: number }> =
						[];
					cursor.events.on('change', (e) => {
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
			{
				fn: (score) => {
					const cursor = score.createCursor();
					const found: Array<{ hasFret: boolean; x: number; w: number }> = [];
					cursor.events.on('change', (e) => {
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
	// A tie must not re-attack the note: the tied-to onset sustains the sounding pitch rather than
	// re-striking it. Walk every step transition of a score that ties two half notes within a bar
	// (M1), a whole note across the barline (M2->M3), and two half notes with a redundant accidental
	// (M4). At each tied continuation the pitch is `sustained` with nothing `started`; the one place
	// the same pitch repeats WITHOUT a tie (M1's C5 into M2's fresh C5) is the control that DOES
	// re-attack. Exercises the real parse -> tiedFrom resolution -> classify path end to end.
	it.concurrent('a tie sustains the note instead of re-attacking it', async () => {
		const { result } = await renderTest(
			'tie.musicxml',
			{},
			{
				fn: (score) => {
					const seq = score.getSequence();
					const pitches = (
						notes: ReadonlyArray<{ getPitch(): string | null }>,
					) => notes.map((n) => n.getPitch()).sort();
					const transitions = [];
					for (let i = 1; i < seq.length; i++) {
						const t = seq.classify(i - 1, i);
						transitions.push({
							started: pitches(t.started),
							sustained: pitches(t.sustained),
							stopped: pitches(t.stopped),
						});
					}
					return { length: seq.length, transitions };
				},
			},
		);

		// Onsets: M1 C5, M1 C5 (tie stop), M2 C5, M3 C5 (tie stop), M4 F#5, M4 F#5 (tie stop).
		expect(result.length).toBe(6);
		expect(result.transitions).toEqual([
			// M1: tied C5 -> C5, sustained, not re-attacked.
			{ started: [], sustained: ['C/5'], stopped: [] },
			// M1 -> M2: same pitch but NOT tied, so it genuinely re-attacks (control).
			{ started: ['C/5'], sustained: [], stopped: ['C/5'] },
			// M2 -> M3: tie across the barline, sustained.
			{ started: [], sustained: ['C/5'], stopped: [] },
			// M3 -> M4: different pitch, C5 releases and F#5 attacks.
			{ started: ['F#/5'], sustained: [], stopped: ['C/5'] },
			// M4: tied F#5 -> F#5, sustained.
			{ started: [], sustained: ['F#/5'], stopped: [] },
		]);
	});

	it.concurrent('a tied chord highlights every member of the tie group', async () => {
		const { result } = await renderTest(
			'tie_chord_dyad.musicxml',
			{},
			{
				fn: (score) => {
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
			},
		);
		expect(result.sounding).toEqual(['C/5', 'C/5', 'E/5', 'E/5']);
		expect(result.whenDone).toBe(0);
	});

	// Repeats and voltas expand the timeline: the score's eleven measures play as sixteen steps
	// in jump order, not straight through. Proves the barlines the renderer draws (repeat dots
	// and "1."/"2."/"3." brackets) and the order playback takes are read from the same
	// <barline>s — in particular that the two-measure first ending plays through before the
	// back-jump rather than jumping from its first measure, and that a three-ending block takes
	// each ending once across three passes. One whole note per measure, so one step per measure.
	it.concurrent('repeats and endings expand the playback order', async () => {
		const { result } = await renderTest(
			'repeats.musicxml',
			{},
			{
				fn: (score) => {
					const seq = score.getSequence();
					const order = [];
					for (let i = 0; i < seq.length; i++) {
						order.push(seq.getStep(i)?.measureIndex);
					}
					return {
						order,
						measureCount: seq.getMeasureCount(),
						// A repeated measure's cursor lands on its first pass, not its last.
						firstStepOfM2: seq.getFirstStepOfMeasure(1),
					};
				},
			},
		);

		// |: M1 M2 :| twice, then M3 into the two-measure 1st ending (M4 M5) and back to M3,
		// skipping the whole exhausted ending into the 2nd (M6), then out to M7. M8 then opens a
		// three-ending block: each pass replays M8 and takes the next ending (M9, M10, M11), and
		// the last one has no back-jump so the block ends there. M12 opens a fourth block with two
		// endings — M13, then back to M12 and out through the two-measure 2nd ending (M14 M15).
		// M8, M13 and M15 are the measures holding two notes rather than a whole note, so each of
		// their passes contributes two steps.
		expect(result.order).toEqual([
			0, 1, 0, 1, 2, 3, 4, 2, 5, 6, 7, 7, 8, 7, 7, 9, 7, 7, 10, 11, 12, 12, 11,
			13, 14, 14,
		]);
		// Document order is unchanged — only playback expands.
		expect(result.measureCount).toBe(15);
		expect(result.firstStepOfM2).toBe(1);
	});

	// <repeat times="5"> plays a block five times, not the two a bare repeat sign means. The render
	// prints "Play 5 times" over the closing barline (repeats_multiple_times.png); this is the other
	// half of the same attribute — the block must actually expand to five passes, or the label
	// promises something playback doesn't do. Five measures, one whole rest each, so one step per
	// measure.
	it.concurrent('a repeat with times="5" plays its block five times', async () => {
		const { result } = await renderTest(
			'repeats_multiple_times.musicxml',
			{},
			{
				fn: (score) => {
					const seq = score.getSequence();
					const order = [];
					for (let i = 0; i < seq.length; i++) {
						order.push(seq.getStep(i)?.measureIndex);
					}
					return order;
				},
			},
		);

		// M1, then |: M2 M3 :| five times over, then out to M4 M5.
		expect(result).toEqual([0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3, 4]);
	});

	// A repeat block nested inside another, each closing with its own 1st/2nd endings
	// (repeats_nested.png draws the brackets). M3-M6 are four consecutive ending measures with no
	// plain measure between them, so the only thing separating the outer volta group from the inner
	// one is the numbering restarting at 1 on M5 — read it as one four-ending group and the outer
	// repeat never jumps back to M1. One whole note per measure, so one step per measure.
	it.concurrent('a nested repeat block replays whole on each outer pass', async () => {
		const { result } = await renderTest(
			'repeats_nested.musicxml',
			{},
			{
				fn: (score) => {
					const seq = score.getSequence();
					const order = [];
					for (let i = 0; i < seq.length; i++) {
						order.push(seq.getStep(i)?.measureIndex);
					}
					return order;
				},
			},
		);

		// Outer pass 1: M1, then the inner block |: M2 :| — M3 (1st ending) back to M2, then M4
		// (2nd ending) — then the outer 1st ending M5, which jumps back to M1. Outer pass 2 replays
		// the inner block in full (the inner endings re-arm), skips the exhausted M5 and closes on
		// the outer 2nd ending M6.
		expect(result).toEqual([0, 1, 2, 1, 3, 4, 0, 1, 2, 1, 3, 5]);
	});

	// A voice that stops before its measure ends (legal, and common in real exports: M1's voice 1 is
	// one quarter with no trailing rest) has no onset at the note's end, so nothing seeds a step
	// boundary there and the quarter used to ring until the next measure's onset. The end itself
	// seeds a step: C5 releases at beat 1 while the whole note under it keeps sounding.
	it.concurrent('a voice that ends before its measure does stops sounding there', async () => {
		const { result } = await renderTest(
			'voice_short.musicxml',
			{},
			{
				fn: (score) => {
					const seq = score.getSequence();
					const steps = [];
					for (let i = 0; i < seq.length; i++) {
						const step = seq.getStep(i);
						steps.push({
							startBeat: step?.startBeat,
							active: (step?.active ?? []).map((n) => n.getPitch()).sort(),
						});
					}
					return steps;
				},
			},
		);

		expect(result).toEqual([
			{ startBeat: 0, active: ['C/5', 'E/3'] },
			{ startBeat: 1, active: ['E/3'] },
			{ startBeat: 4, active: ['G/4'] },
		]);
	});
});
