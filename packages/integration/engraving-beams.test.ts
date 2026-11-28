import { describe, expect, it } from 'bun:test';
import { formatSpaces } from './engraving-marks';
import {
	bandHeight,
	beamGroups,
	floatingBands,
	outerEdge,
} from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 17–19 and 24–25: beam placement and direction (ENGRAVING.md); the
// angles of pp. 19–26 belong to engraving-beam-angles.test.ts. beams.musicxml, treble, 4/4:
// - M1: G4 sixteenths. M2: G4 32nds. M3: dotted-eighth + sixteenth on G4, then C5.
// - M4 to M7: repeated A4 / G4 / C5 / D5 in eighths, sixteenths and 32nds (space and line
//   notes, up and down). M8: G4 and C5 64ths. M9: C6 and A3 beamed on ledger lines.
// - M20: G5 E4 F4 F5 and D5 D4 E4 C5. M21: A4 C5 A4 G4 and G4 C6 A4 G4.
// - M22: A4 to C5 and G4 to D5. M25: G4 C6 A4 F4 G4 A4. (M10 to M19 and M23 to M24 are the angle cases.)

describe('Behind Bars beam placement (pp. 17–19, 24–25)', () => {
	it.concurrent('draws beams', async () => {
		expect(await draw('beams')).toMatchScreenshot('engraving_beams.png');
	});

	// A beam is ½ stave-space thick, with ¼ space between beams.
	it.concurrent('beam-thickness (p. 17): draws beams ½ thick and ¼ apart', async () => {
		expect(await beamBandSizes()).toMatchMeasurements({
			thickness: [0.5],
			gaps: [0.25],
		});
	});

	// Every stem runs through the inner beams to the outer one.
	it.concurrent('beam-stems-through (p. 17): runs every stem to the outer beam', async () => {
		expect(await stemsShortOfOuterBeam()).toMatchMeasurements([]);
	});

	// A fractional beam is as long as a notehead.
	it.concurrent('beam-fractional (p. 17): draws fractional beams a notehead long', async () => {
		expect(await fractionalOverhang()).toMatchMeasurements([0, 0]);
	});

	// A horizontal beam in the stave hangs from, sits on or centres on a line.
	it.concurrent('beam-horizontal-on-line (pp. 17–18): attaches horizontal beams to lines', async () => {
		expect(await floatingAt([3, 4, 5, 6])).toMatchMeasurements([]);
	});

	// Four beams spread to meet lines; failing that, one beam in a space is acceptable.
	it.concurrent('beam-four (p. 18): leaves at most one of four beams in a space', async () => {
		expect(await fourBeamFloating()).toMatchMeasurements(['ok', 'ok']);
	});

	// With one or two beams, a stem to the outer beam edge is 3½ in a space, 3¼ on a line.
	it.concurrent('beam-stem-length (pp. 18–19): beams space notes at 3½, line notes at 3¼', async () => {
		expect(await beamedStemLengths([3, 4, 5, 6])).toMatchMeasurements([
			[3.5, 3.5, 3.5, 3.5, 3.5, 3.5],
			[3.25, 3.25, 3.25, 3.25, 3.25, 3.25],
			[3.5, 3.5, 3.5, 3.5, 3.5, 3.5],
			[3.25, 3.25, 3.25, 3.25, 3.25, 3.25],
		]);
	});

	// With three or more beams, no beam comes nearer the head than 2½ spaces.
	it.concurrent('beam-extra-stems (p. 19): keeps inner beams 2½ from the head', async () => {
		expect(await innermostBeamGap()).toMatchMeasurements('≥2½');
	});

	// One clear stave line lies between the innermost beam and the first ledger line.
	it.concurrent('beam-ledger-clear (p. 19): leaves the outer line clear of beams', async () => {
		expect(await ledgerBeamsClear()).toMatchMeasurements([
			'clear',
			'clear',
			'clear',
		]);
	});

	// With as many notes above the middle line as below, the furthest note decides.
	it.concurrent('beam-direction-equal (p. 24): lets the furthest note decide', async () => {
		expect(await directions(19, 'beam-direction-equal')).toMatchMeasurements([
			'down',
			'up',
		]);
	});

	// Otherwise the majority decides, unless a far minority would stretch the stems.
	it.concurrent('beam-direction-majority (p. 24): follows the majority, bar far notes', async () => {
		expect(await directions(20, 'beam-direction-majority')).toMatchMeasurements(
			['up', 'down'],
		);
		// M25: one far C6 among five notes below the middle line stems the group down.
		expect(await directions(24, 'beam-direction-majority')).toMatchMeasurements(
			['down'],
		);
	});

	// Equidistant notes, with nothing else to go by, take down-stems.
	it.concurrent('beam-direction-equidistant (pp. 24–25): stems equidistant groups down', async () => {
		expect(
			await directions(21, 'beam-direction-equidistant'),
		).toMatchMeasurements(['down', 'down']);
	});
});

/** Beam band heights and the gaps between bands, in quarter-spaces, over M1 and M2. */
async function beamBandSizes() {
	const e = await engrave('beams', 'beam-thickness');
	const groups = [0, 1].flatMap((m) => beamGroups(e, m));
	const stems = groups.flatMap((g) => g.stems);
	const space = e.space();
	const thickness = stems.flatMap((st) =>
		st.bands.map((b) => quarters(bandHeight(b), space)),
	);
	const gaps = stems.flatMap((st) =>
		st.bands.slice(1).map((b, i) => {
			const prev = must(st.bands[i], 'beam band');
			const gap = st.direction === 'up' ? b[0] - prev[1] : prev[0] - b[1];
			return quarters(gap, space);
		}),
	);
	for (const g of groups) {
		const st = must(g.stems[0], 'beam stem');
		const first = must(st.bands[0], 'outer beam');
		const second = st.bands[1];
		const t = quarters(bandHeight(first), space);
		const x = g.beam.box.x - 6;
		e.marks.measure({
			kind: 'bracket',
			from: { x, y: first[0] },
			to: { x, y: first[1] },
			label: formatSpaces(t),
			note: `Beam thickness ${formatSpaces(t)} spaces (expected ½)`,
			pass: t === 0.5,
		});
		if (second) {
			const gapPx =
				st.direction === 'up' ? second[0] - first[1] : first[0] - second[1];
			const gap = quarters(gapPx, space);
			const gx = g.beam.box.x + g.beam.box.w + 6;
			const top = st.direction === 'up' ? first[1] : second[1];
			const bottom = st.direction === 'up' ? second[0] : first[0];
			e.marks.measure({
				kind: 'bracket',
				from: { x: gx, y: top },
				to: { x: gx, y: bottom },
				label: formatSpaces(gap),
				note: `Gap between beams ${formatSpaces(gap)} spaces (expected ¼)`,
				pass: gap === 0.25,
			});
		}
	}
	return e.check({
		thickness: [...new Set(thickness)],
		gaps: [...new Set(gaps)],
	});
}

/** Stems whose tip stops short of, or runs past, their group's outer beam. */
async function stemsShortOfOuterBeam() {
	const e = await engrave('beams', 'beam-stems-through');
	const short: string[] = [];
	for (let m = 0; m < 23; m++) {
		for (const g of beamGroups(e, m)) {
			for (const st of g.stems) {
				const outer = st.bands[0];
				const bad = !outer || st.tip < outer[0] - 1 || st.tip > outer[1] + 1;
				if (bad) {
					short.push(`M${m + 1} x=${st.x}`);
					e.marks.measure({
						kind: 'box',
						from: { x: st.x - 4, y: st.tip - 4 },
						to: { x: st.x + 4, y: st.tip + 4 },
						label: 'short',
						note: `M${m + 1} stem at x=${st.x} does not reach outer beam`,
						pass: false,
					});
				}
			}
		}
	}
	// Highlight the M1 and M2 groups where every stem crosses inner beams to the outer beam.
	for (const m of [0, 1]) {
		for (const g of beamGroups(e, m)) {
			const st0 = must(g.stems[0], 'first stem');
			const stN = must(g.stems.at(-1), 'last stem');
			const outer = must(st0.bands[0], 'outer beam');
			const outerY = st0.direction === 'up' ? outer[0] : outer[1];
			e.marks.reference(`outer-beam-m${m}-${Math.round(g.beam.box.x)}`, {
				kind: 'line',
				from: { x: g.beam.box.x - 2, y: outerY },
				to: { x: g.beam.box.x + g.beam.box.w + 2, y: outerY },
				label: 'outer beam',
				note: `M${m + 1} outer beam edge`,
			});
			e.marks.measure({
				kind: 'box',
				from: { x: st0.x - 2, y: g.beam.box.y - 2 },
				to: { x: stN.x + 2, y: g.beam.box.y + g.beam.box.h + 2 },
				label: 'through',
				note: `M${m + 1}: all ${g.stems.length} stems reach the outer beam`,
				pass: true,
			});
		}
	}
	return e.check(short);
}

/** How much longer than its head each fractional beam is, in quarter-spaces. */
async function fractionalOverhang() {
	const e = await engrave('beams', 'beam-fractional');
	const space = e.space(2);
	const overhangs = beamGroups(e, 2).map((g) => {
		// The fractional beam is the group's shorter run of beam ink.
		let shortest: { y: number; a: number; b: number; w: number } | null = null;
		for (const y of g.beam.rowYs()) {
			for (const [a, b] of g.beam.segmentsAt(y)) {
				const w = b - a;
				if (!shortest || w < shortest.w) {
					shortest = { y, a, b, w };
				}
			}
		}
		const seg = must(shortest, 'fractional beam segment');
		const head = must(g.stems[0]?.heads[0], 'beamed note');
		const diff = quarters(seg.w - head.head.w, space);
		const segSp = Math.round((seg.w / space) * 10) / 10;
		const headSp = Math.round((head.head.w / space) * 10) / 10;
		const dir = must(g.stems[0], 'stem').direction;
		const refY = dir === 'up' ? head.head.y + head.head.h + 6 : head.head.y - 6;
		e.marks.reference(`head-w-${Math.round(head.head.x)}`, {
			kind: 'line',
			from: { x: head.head.x, y: refY },
			to: { x: head.head.x + head.head.w, y: refY },
			label: `${headSp}`,
			note: `${head.pitch ?? 'note'} notehead width ${headSp} spaces`,
		});
		const bracketY = dir === 'up' ? seg.y + 8 : seg.y - 8;
		e.marks.measure({
			kind: 'bracket',
			from: { x: seg.a, y: bracketY },
			to: { x: seg.b, y: bracketY },
			label: `${segSp}`,
			note: `Fractional beam ${segSp} spaces vs ${headSp}-space notehead (diff ${formatSpaces(diff)})`,
		});
		return diff;
	});
	return e.check(overhangs);
}

/** Beam bands left mid-space inside the stave, at each group's first stem. */
async function floatingAt(measures: number[]) {
	const e = await engrave('beams', 'beam-horizontal-on-line');
	const floating: string[] = [];
	for (const m of measures) {
		const lines = e.lines(m);
		for (const g of beamGroups(e, m)) {
			const st = must(g.stems[0], 'stem');
			const bad = floatingBands(st, lines);
			for (const band of bad) {
				floating.push(`M${m + 1} ${st.heads[0]?.pitch} [${band}]`);
			}
			e.marks.measure({
				kind: 'box',
				from: { x: g.beam.box.x - 1, y: g.beam.box.y - 1 },
				to: {
					x: g.beam.box.x + g.beam.box.w + 1,
					y: g.beam.box.y + g.beam.box.h + 1,
				},
				label: bad.length === 0 ? 'on line' : `${bad.length} mid-space`,
				note:
					bad.length === 0
						? `M${m + 1} ${st.heads[0]?.pitch ?? ''}: all ${st.bands.length} horizontal beam(s) touch a stave line`
						: `M${m + 1} ${st.heads[0]?.pitch ?? ''}: ${bad.length} beam band(s) floating mid-space`,
				pass: bad.length === 0,
			});
		}
	}
	return e.check(floating);
}

/** Whether each four-beam group in M8 leaves at most one beam floating mid-space. */
async function fourBeamFloating() {
	const e = await engrave('beams', 'beam-four');
	const lines = e.lines(7);
	const results = beamGroups(e, 7).map((g) => {
		const st = must(g.stems[0], 'stem');
		const count = floatingBands(st, lines).length;
		const ok = count <= 1;
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: `${count} mid-space`,
			note: `M8 ${st.heads[0]?.pitch ?? ''}: ${count} of ${st.bands.length} beams floating mid-space (expected ≤1)`,
		});
		return ok ? 'ok' : `${count} floating`;
	});
	return e.check(results);
}

/** Lengths from head centre to the outer beam edge of one- and two-beam stems. */
async function beamedStemLengths(measures: number[]) {
	const e = await engrave('beams', 'beam-stem-length');
	const space = e.space();
	const results = measures.map((m) =>
		beamGroups(e, m)
			.filter((g) => (g.stems[0]?.bands.length ?? 0) <= 2)
			.flatMap((g) =>
				g.stems.map((st) => {
					const head = must(st.heads[0], 'head');
					const edge = outerEdge(st);
					const len = quarters(Math.abs(edge - head.cy), space);
					const bracketX = st.direction === 'up' ? st.x + 6 : st.x - 6;
					e.marks.measure({
						kind: 'bracket',
						from: { x: bracketX, y: head.cy },
						to: { x: bracketX, y: edge },
						label: formatSpaces(len),
						note: `M${m + 1} ${head.pitch ?? 'note'}: ${formatSpaces(len)} spaces from head centre to outer beam`,
					});
					return len;
				}),
			),
	);
	return e.check(results);
}

/** The closest any inner beam of a three-or-more-beam group comes to its head. */
async function innermostBeamGap() {
	const e = await engrave('beams', 'beam-extra-stems');
	const space = e.space();
	const gaps: number[] = [];
	for (const m of [1, 3, 4, 5, 6, 7]) {
		for (const g of beamGroups(e, m)) {
			if ((g.stems[0]?.bands.length ?? 0) < 3) {
				continue;
			}
			let groupMin = Infinity;
			for (const st of g.stems) {
				const inner = must(st.bands.at(-1), 'inner beam');
				const head = must(st.heads.at(-1), 'head');
				const edge = st.direction === 'up' ? inner[1] : inner[0];
				const gap = quarters(Math.abs(edge - head.cy), space);
				gaps.push(gap);
				groupMin = Math.min(groupMin, gap);
			}
			const st0 = must(g.stems[0], 'first stem');
			const inner0 = must(st0.bands.at(-1), 'inner beam');
			const head0 = must(st0.heads.at(-1), 'head');
			const edge0 = st0.direction === 'up' ? inner0[1] : inner0[0];
			const bracketX = st0.direction === 'up' ? st0.x - 6 : st0.x + 6;
			e.marks.measure({
				kind: 'bracket',
				from: { x: bracketX, y: head0.cy },
				to: { x: bracketX, y: edge0 },
				label: formatSpaces(groupMin),
				note: `M${m + 1} ${head0.pitch ?? 'note'} (${st0.bands.length} beams): ${formatSpaces(groupMin)} spaces from head to innermost beam (expected ≥2½)`,
				pass: groupMin >= 2.5,
			});
		}
	}
	const minGap = Math.min(...gaps);
	return e.check(minGap >= 2.5 ? '≥2½' : formatSpaces(minGap));
}

/** Whether each ledger-note group's innermost beam leaves the outer stave line clear. */
async function ledgerBeamsClear() {
	const e = await engrave('beams', 'beam-ledger-clear');
	const lines = e.lines(8);
	const rect = e.measureRect(8);
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
	const results = beamGroups(e, 8).map((g) => {
		const st = must(g.stems[0], 'stem');
		const inner = must(st.bands.at(-1), 'inner beam');
		const clear =
			st.direction === 'down'
				? inner[0] > (lines[0] ?? 0) + 1
				: inner[1] < (lines[4] ?? 0) - 1;
		const outerLine =
			st.direction === 'down' ? (lines[0] ?? 0) : (lines[4] ?? 0);
		const innerEdge = st.direction === 'down' ? inner[0] : inner[1];
		const verdict = clear ? 'clear' : 'on the outer line';
		e.marks.measure({
			kind: 'bracket',
			from: { x: st.x - 6, y: outerLine },
			to: { x: st.x - 6, y: innerEdge },
			label: verdict,
			note: `M9 ${st.heads[0]?.pitch ?? ''}: innermost beam is ${verdict} of outer stave line`,
		});
		return verdict;
	});
	return e.check(results);
}

/** Stem directions of each beam group in measure m, with middle-line reference and marks. */
async function directions(m: number, rule: string) {
	const e = await engrave('beams', rule);
	const rect = e.measureRect(m);
	const midY = e.middle(m);
	e.marks.reference(`middle-line-${m}`, {
		kind: 'line',
		from: { x: rect.x, y: midY },
		to: { x: rect.x + rect.w, y: midY },
		label: 'middle line',
		note: 'Middle stave line',
	});
	const dirs = beamGroups(e, m).map((g) => {
		const st = must(g.stems[0], 'stem');
		const dir = st.direction;
		e.marks.measure({
			kind: 'box',
			from: { x: g.beam.box.x - 2, y: g.beam.box.y - 2 },
			to: {
				x: g.beam.box.x + g.beam.box.w + 2,
				y: g.beam.box.y + g.beam.box.h + 2,
			},
			label: dir,
			note: `M${m + 1} group stems ${dir}`,
		});
		return dir;
	});
	return e.check(dirs);
}
