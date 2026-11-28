import { describe, expect, it } from 'bun:test';
import { formatSpaces } from './engraving-marks';
import {
	type BeamGroup,
	beamGroups,
	beamRise,
	floatingBands,
	outerEdge,
} from './engraving-model';
import { engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 19–26: beam angles (ENGRAVING.md), on beams.musicxml (drawn in
// engraving-beams.test.ts), treble, 4/4:
// - M10: E4 to E5 and D4 to A5 eighth pairs. M11: an eight-eighth descent A5→A3.
// - M12: eight close-set 32nds C5→E6. M13: rising pairs and groups inside the stave.
// - M14: pairs above and below the stave (thirds and seconds).
// - M15: C5 E4 F4 G4 and G4 C4 E4 A4. M16: C5 G5 E5 C5 and E4 G4 E4 G4.
// - M17: concave G4 C5 A4 and convex G4 D4 A4. M18: G3 G4 G4 G4 and A4 A4 A4 D5.
// - M19: chords with level and rising top notes.
// - M23: A5 down-stem with C4 and A3 up-stems. M24: a bass clef inside a beamed group.
// A beam's fall is from its first stem to its last, in quarter-spaces: positive falls,
// negative rises, 0 is horizontal.

describe('Behind Bars beam angles (pp. 19–26)', () => {
	// A short group's beam crosses at most one stave-space, a long group's at most two.
	it.concurrent('beam-slope-limit (pp. 19–20): slopes short groups ≤1 space, long ≤2', async () => {
		expect(await slopeLimits()).toMatchMeasurements({
			short: '≤1',
			long: '≤2',
		});
	});

	// Notes closer than three spaces take only a slight angle, ¼ or ½ space.
	it.concurrent('beam-slope-close (p. 20): slopes close-set groups ¼ to ½ space', async () => {
		expect(await closeGroup()).toMatchMeasurements({
			spacing: '<3',
			fall: '¼ to ½',
		});
	});

	// Both ends of a slanted beam inside the stave meet a stave line.
	it.concurrent('beam-slope-ends-on-lines (pp. 20–21): attaches slanted beam ends to lines', async () => {
		expect(await floatingEnds()).toMatchMeasurements([]);
	});

	// The shortest stem of a slanted group may shorten to 3 inside the stave, 2½ outside.
	it.concurrent('beam-slope-shortest-stem (p. 21): keeps the shortest stem 3 in, 2½ out', async () => {
		expect(await shortestStems()).toMatchMeasurements({
			inside: '≥3',
			outside: '≥2½',
		});
	});

	// Groups beyond the first ledger line slope ¼ for a second, ½ for wider intervals.
	it.concurrent('beam-ledger-slight (p. 21): slopes ledger groups ¼ or ½', async () => {
		expect(await ledgerSlopes()).toMatchMeasurements([0.5, 0.25, 0.5, 0.25]);
	});

	// A beam slants with the interval between its outer notes.
	it.concurrent('beam-slope-direction (p. 22): slants with the outer interval', async () => {
		expect(
			await measureSlopes(14, 'beam-slope-direction', ['falls', 'rises']),
		).toMatchMeasurements(['falls', 'rises']);
	});

	// Same-ended, repeated-pattern and concave groups take horizontal beams.
	it.concurrent('beam-horizontal-cases (pp. 22–23): flattens same-ended and concave groups', async () => {
		expect(await horizontalCases()).toMatchMeasurements([
			'flat',
			'flat',
			'flat',
		]);
	});

	// A convex group (inner notes further from the beam) slopes.
	it.concurrent('beam-convex (p. 23): slopes a convex group', async () => {
		expect(await convexCase()).toMatchMeasurements('rises');
	});

	// Two pitches with an odd end note: flat when it is furthest from the beam, else sloped.
	it.concurrent('beam-two-pitches (p. 23): flattens for a far odd note, slopes for a near one', async () => {
		expect(
			await measureSlopes(17, 'beam-two-pitches', ['flat', 'rises']),
		).toMatchMeasurements(['flat', 'rises']);
	});

	// A beam slants by the notes' stave positions, whatever the clef, and clears the clef.
	it.concurrent('beam-clef-change (p. 23): keeps the beam out of a mid-group clef', async () => {
		expect(await beamThroughClef()).toMatchMeasurements({
			hasClef: true,
			overlap: 0,
		});
	});

	// In chords, the note nearest the beam sets its angle.
	it.concurrent('beam-chord-angle (p. 24): angles chord beams by the notes nearest them', async () => {
		expect(
			await measureSlopes(18, 'beam-chord-angle', ['flat', 'rises']),
		).toMatchMeasurements(['flat', 'rises']);
	});

	// A beam between opposite stems keeps stems ≥2½, clears the outer lines, and slants
	// with the outer interval.
	it.concurrent('beam-kneed (p. 26): centres kneed beams, slanted with the interval', async () => {
		expect(await kneed()).toMatchMeasurements({
			shortest: 'at least 2½',
			onOuterLine: [false, false],
			slopes: ['falls', 'falls'],
		});
	});
});

function slope(fall: number): string {
	if (fall === 0) {
		return 'flat';
	}
	return fall > 0 ? 'falls' : 'rises';
}

/** Steepest beam rise/fall in M10 (short pairs, ≤1) and M11 (long run, ≤2). */
async function slopeLimits() {
	const e = await engrave('beams', 'beam-slope-limit');
	const space = e.space();
	const markGroup = (g: BeamGroup, m: number, limit: number) => {
		const mag = Math.abs(quarters(beamRise(g), space));
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: formatSpaces(mag),
			note: `M${m + 1} beam spans ${formatSpaces(mag)} spaces (expected ≤${formatSpaces(limit)})`,
			pass: mag <= limit,
		});
		return mag;
	};
	const shortMax = Math.max(...beamGroups(e, 9).map((g) => markGroup(g, 9, 1)));
	const longMax = Math.max(
		...beamGroups(e, 10).map((g) => markGroup(g, 10, 2)),
	);
	return e.check({
		short: shortMax <= 1 ? '≤1' : formatSpaces(shortMax),
		long: longMax <= 2 ? '≤2' : formatSpaces(longMax),
	});
}

/** The close-set group's average stem spacing and its fall, in quarter-spaces. */
async function closeGroup() {
	const e = await engrave('beams', 'beam-slope-close');
	const space = e.space(11);
	const g = must(beamGroups(e, 11)[0], 'close-set group');
	const first = must(g.stems[0], 'stem');
	const last = must(g.stems.at(-1), 'stem');
	const spacing = quarters((last.x - first.x) / (g.stems.length - 1), space);
	const fall = quarters(beamRise(g), space);
	const second = must(g.stems[1], 'second stem');
	const refY = g.beam.box.y + g.beam.box.h + 10;
	e.marks.reference('close-spacing', {
		kind: 'line',
		from: { x: first.x, y: refY },
		to: { x: second.x, y: refY },
		label: `${formatSpaces(spacing)} sp`,
		note: `M12 average stem spacing ${formatSpaces(spacing)} spaces (<3)`,
	});
	const ok = fall === -0.25 || fall === -0.5;
	e.marks.measure({
		kind: 'box',
		from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
		to: {
			x: g.beam.box.x + g.beam.box.w + 2,
			y: g.beam.box.y + g.beam.box.h + 2,
		},
		label: formatSpaces(fall),
		note: `M12 close-set 32nds slope ${formatSpaces(fall)} spaces (expected -¼ or -½)`,
		pass: ok,
	});
	return e.check({
		spacing: spacing < 3 ? '<3' : formatSpaces(spacing),
		fall: ok ? '¼ to ½' : formatSpaces(fall),
	});
}

/** Slanted-beam bands that end mid-space, at the first and last stems of M13's groups. */
async function floatingEnds() {
	const e = await engrave('beams', 'beam-slope-ends-on-lines');
	const lines = e.lines(12);
	const floating: string[] = [];
	for (const g of beamGroups(e, 12)) {
		for (const st of [must(g.stems[0], 'stem'), must(g.stems.at(-1), 'stem')]) {
			const bad = floatingBands(st, lines);
			for (const band of bad) {
				floating.push(`${st.heads[0]?.pitch} [${band}]`);
			}
			const outer = must(st.bands[0], 'outer beam');
			const inner = must(st.bands.at(-1), 'inner beam');
			const top = Math.min(outer[0], inner[0]);
			const bottom = Math.max(outer[1], inner[1]);
			e.marks.measure({
				kind: 'box',
				from: { x: st.x - 3, y: top - 2 },
				to: { x: st.x + 3, y: bottom + 2 },
				label: bad.length === 0 ? 'line' : `${bad.length} mid`,
				note:
					bad.length === 0
						? `M13 ${st.heads[0]?.pitch ?? ''}: all beam ends touch a stave line`
						: `M13 ${st.heads[0]?.pitch ?? ''}: ${bad.length} beam end(s) mid-space`,
				pass: bad.length === 0,
			});
		}
	}
	return e.check(floating);
}

/** Shortest stem of slanted groups inside the stave (M10, M13, ≥3) and outside (M14, ≥2½). */
async function shortestStems() {
	const e = await engrave('beams', 'beam-slope-shortest-stem');
	const space = e.space();
	const measureMin = (measures: number[], limit: number) => {
		let best = Infinity;
		for (const m of measures) {
			for (const g of beamGroups(e, m)) {
				let groupMin = Infinity;
				let shortest = must(g.stems[0], 'stem');
				for (const st of g.stems) {
					const len = quarters(
						Math.abs(outerEdge(st) - must(st.heads[0], 'head').cy),
						space,
					);
					if (len < groupMin) {
						groupMin = len;
						shortest = st;
					}
				}
				best = Math.min(best, groupMin);
				const head = must(shortest.heads[0], 'head');
				const edge = outerEdge(shortest);
				const bracketX =
					shortest.direction === 'up' ? shortest.x + 6 : shortest.x - 6;
				e.marks.measure({
					kind: 'bracket',
					from: { x: bracketX, y: head.cy },
					to: { x: bracketX, y: edge },
					label: formatSpaces(groupMin),
					note: `M${m + 1} ${head.pitch ?? 'note'}: shortest stem ${formatSpaces(groupMin)} spaces (expected ≥${formatSpaces(limit)})`,
					pass: groupMin >= limit,
				});
			}
		}
		return best;
	};
	const inside = measureMin([9, 12], 3);
	const outside = measureMin([13], 2.5);
	return e.check({
		inside: inside >= 3 ? '≥3' : formatSpaces(inside),
		outside: outside >= 2.5 ? '≥2½' : formatSpaces(outside),
	});
}

/** Slope magnitudes of the four ledger-line pairs in M14. */
async function ledgerSlopes() {
	const e = await engrave('beams', 'beam-ledger-slight');
	const space = e.space(13);
	const expected = [0.5, 0.25, 0.5, 0.25];
	const values = beamGroups(e, 13).map((g, i) => {
		const mag = Math.abs(quarters(beamRise(g), space));
		const want = expected[i] ?? 0.5;
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: formatSpaces(mag),
			note: `M14 group ${i + 1}: slope ${formatSpaces(mag)} spaces (expected ${formatSpaces(want)})`,
			pass: mag === want,
		});
		return mag;
	});
	return e.check(values);
}

/** Slope directions of every beam group in measure m. */
async function measureSlopes(m: number, rule: string, expected: string[]) {
	const e = await engrave('beams', rule);
	const space = e.space(m);
	const dirs = beamGroups(e, m).map((g, i) => {
		const fall = quarters(beamRise(g), space);
		const dir = slope(fall);
		const want = expected[i];
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: dir,
			note: `M${m + 1} group ${i + 1}: ${dir} (${formatSpaces(fall)} spaces${want ? `, expected ${want}` : ''})`,
			pass: want === undefined ? undefined : dir === want,
		});
		return dir;
	});
	return e.check(dirs);
}

/** Same-ended (M16[0]), repeated-pattern (M16[1]), and concave (M17[0]) groups. */
async function horizontalCases() {
	const e = await engrave('beams', 'beam-horizontal-cases');
	const targets: [number, BeamGroup, string][] = [
		...beamGroups(e, 15).map((g, i): [number, BeamGroup, string] => [
			15,
			g,
			i === 0 ? 'same-ended' : 'repeated pattern',
		]),
		[16, must(beamGroups(e, 16)[0], 'concave group'), 'concave'],
	];
	const dirs = targets.map(([m, g, kind]) => {
		const fall = quarters(beamRise(g), e.space(m));
		const dir = slope(fall);
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: dir,
			note: `M${m + 1} (${kind}): ${dir} (${formatSpaces(fall)} spaces, expected flat)`,
			pass: dir === 'flat',
		});
		return dir;
	});
	return e.check(dirs);
}

/** Convex group in M17[1] (G4 D4 A4). */
async function convexCase() {
	const e = await engrave('beams', 'beam-convex');
	const g = must(beamGroups(e, 16)[1], 'convex group');
	const fall = quarters(beamRise(g), e.space(16));
	const dir = slope(fall);
	e.marks.measure({
		kind: 'box',
		from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
		to: {
			x: g.beam.box.x + g.beam.box.w + 2,
			y: g.beam.box.y + g.beam.box.h + 2,
		},
		label: dir,
		note: `M17 convex group: ${dir} (${formatSpaces(fall)} spaces, expected rises)`,
		pass: dir === 'rises',
	});
	return e.check(dir);
}

/** Pixels where M24's beam and its mid-group clef overlap. */
async function beamThroughClef() {
	const e = await engrave('beams', 'beam-clef-change');
	const beams = e.inMeasure('beam', 23);
	const clefs = e
		.inMeasure('clef', 23)
		.filter((c) =>
			beams.some(
				(b) => c.box.x + c.box.w >= b.box.x && c.box.x <= b.box.x + b.box.w,
			),
		);
	const overlap = beams.reduce(
		(n, b) => n + clefs.reduce((m, c) => m + b.overlaps(c), 0),
		0,
	);
	const hasClef = clefs.length > 0;
	for (const [i, c] of clefs.entries()) {
		e.marks.reference(`mid-clef-${i}`, {
			kind: 'box',
			from: { x: c.box.x - 2, y: c.box.y - 2 },
			to: { x: c.box.x + c.box.w + 2, y: c.box.y + c.box.h + 2 },
			label: 'clef',
			note: 'M24 mid-group bass clef',
		});
	}
	for (const b of beams) {
		e.marks.measure({
			kind: 'box',
			from: { x: b.box.x - 2, y: b.box.y - 2 },
			to: { x: b.box.x + b.box.w + 2, y: b.box.y + b.box.h + 2 },
			label: overlap === 0 ? 'clear' : `${overlap}px`,
			note:
				overlap === 0
					? 'M24 beam clears the mid-group clef (0px overlap)'
					: `M24 beam overlaps the mid-group clef by ${overlap}px`,
			pass: hasClef && overlap === 0,
		});
	}
	return e.check({ hasClef, overlap });
}

/** The kneed groups: shortest stem, whether a beam crosses an outer line, and slope. */
async function kneed() {
	const e = await engrave('beams', 'beam-kneed');
	const groups = beamGroups(e, 22);
	const lines = e.lines(22);
	const rect = e.measureRect(22);
	const space = e.space(22);
	if (lines[0] !== undefined) {
		e.marks.reference('outer-top', {
			kind: 'line',
			from: { x: rect.x, y: lines[0] },
			to: { x: rect.x + rect.w, y: lines[0] },
			label: 'outer line',
			note: 'Top outer stave line',
		});
	}
	if (lines[4] !== undefined) {
		e.marks.reference('outer-bottom', {
			kind: 'line',
			from: { x: rect.x, y: lines[4] },
			to: { x: rect.x + rect.w, y: lines[4] },
			label: 'outer line',
			note: 'Bottom outer stave line',
		});
	}
	const stems = groups.flatMap((g) =>
		g.stems.map((st) => {
			const head = must(st.heads[0], 'head');
			const len = quarters(Math.abs(st.tip - head.cy), space);
			const bx = st.direction === 'up' ? st.x + 6 : st.x - 6;
			e.marks.measure({
				kind: 'bracket',
				from: { x: bx, y: head.cy },
				to: { x: bx, y: st.tip },
				label: formatSpaces(len),
				note: `M23 ${head.pitch ?? 'note'}: stem ${formatSpaces(len)} spaces (expected ≥2½)`,
				pass: len >= 2.5,
			});
			return len;
		}),
	);
	const onOuterLine = groups.map((g) =>
		[lines[0], lines[4]].some(
			(y) => g.beam.segmentsAt(Math.round(y ?? 0)).length > 0,
		),
	);
	const slopes = groups.map((g, i) => {
		const fall = quarters(beamRise(g), space);
		const dir = slope(fall);
		const touchesOuter = onOuterLine[i] ?? false;
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: dir,
			note: `M23 kneed group ${i + 1}: ${dir} (${formatSpaces(fall)} spaces, expected falls; ${touchesOuter ? 'crosses outer line' : 'outer lines clear'})`,
			pass: dir === 'falls' && !touchesOuter,
		});
		return dir;
	});
	return e.check({
		shortest: Math.min(...stems) >= 2.5 ? 'at least 2½' : 'under 2½',
		onOuterLine,
		slopes,
	});
}
