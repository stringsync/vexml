import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

// Behind Bars, pp. 287-300: percussion two-player layouts, rolls, rim shots, timpani, drums, cymbals.
// - percussion-two-players.musicxml: 1-line stave with two voices above/below line (M1 and M2) and shared
//   notehead with opposing stems for two-stick strike (M3).
// - percussion-rolls.musicxml: 5-line percussion stave with tied 3-stroke tremolo rolls across barlines
//   (M1 and M2) and punctuated with an accent (M3).
// - percussion-rimshots.musicxml: 1-line stave with normal, x, circle-x, and circled noteheads.
// - percussion-timpani.musicxml: bass-clef timpani with struck glissando + slur (M1) and rolled
//   glissando + tremolo strokes (M2).
// - percussion-drums.musicxml: 5-line percussion stave with beamed 2- and 3-note grace groups with
//   slurs (M1, closed strokes) and without slurs (M2, open strokes).
// - percussion-cymbals.musicxml: 5-line percussion stave with crossed hi-hat noteheads carrying
//   open, stopped, and half-muted symbols.

describe('Behind Bars percussion layouts, rolls, timpani, drums, and cymbals (pp. 287–300)', () => {
	it.concurrent('draws percussion-two-players', async () => {
		expect(await draw('percussion-two-players')).toMatchScreenshot(
			'engraving_percussion-two-players.png',
		);
	});

	it.concurrent('draws percussion-rolls', async () => {
		expect(await draw('percussion-rolls')).toMatchScreenshot(
			'engraving_percussion-rolls.png',
		);
	});

	it.concurrent('draws percussion-rimshots', async () => {
		expect(await draw('percussion-rimshots')).toMatchScreenshot(
			'engraving_percussion-rimshots.png',
		);
	});

	it.concurrent('draws percussion-timpani', async () => {
		expect(await draw('percussion-timpani')).toMatchScreenshot(
			'engraving_percussion-timpani.png',
		);
	});

	it.concurrent('draws percussion-drums', async () => {
		expect(await draw('percussion-drums')).toMatchScreenshot(
			'engraving_percussion-drums.png',
		);
	});

	it.concurrent('draws percussion-cymbals', async () => {
		expect(await draw('percussion-cymbals')).toMatchScreenshot(
			'engraving_percussion-cymbals.png',
		);
	});

	// Two percussion players sharing a single-line stave take opposing stems and separated rests.
	it.concurrent('perc-two-players-single-line (pp. 288–289): places upper player up-stemmed above and lower down-stemmed below a single line', async () => {
		const e = await engrave(
			'percussion-two-players',
			'perc-two-players-single-line',
		);
		const lineY = must(e.lines(0, 0)[2], 'M1 single stave line');
		const space = e.space(0, 0);
		const m1Pairs = inkStemDirections(e, 0, 0);
		for (const p of m1Pairs) {
			markBox(e, p.stem.box, p.dir);
		}
		const m1Dirs = m1Pairs.map((p) => p.dir);
		const m1Rests = e.inMeasure('rest', 0, 0);
		for (const r of m1Rests) {
			const rcy = r.box.y + r.box.h / 2;
			markBox(e, r.box, rcy < lineY ? 'rest above' : 'rest below');
		}
		const restsAbove = m1Rests.filter(
			(r) => r.box.y + r.box.h / 2 < lineY - 0.3 * space,
		).length;
		const restsBelow = m1Rests.filter(
			(r) => r.box.y + r.box.h / 2 > lineY + 0.3 * space,
		).length;

		const m2Pairs = inkStemDirections(e, 1, 0);
		for (const p of m2Pairs) {
			markBox(e, p.stem.box, p.dir);
		}
		const m2Up = m2Pairs.filter((p) => p.dir === 'up').length;
		const m2Down = m2Pairs.filter((p) => p.dir === 'down').length;

		expect(
			e.check({
				m1Dirs,
				restsAbove,
				restsBelow,
				m2Up,
				m2Down,
			}),
		).toMatchMeasurements({
			m1Dirs: ['up', 'down', 'up', 'down'],
			restsAbove: 2,
			restsBelow: 2,
			m2Up: 2,
			m2Down: 2,
		});
	});

	// Two opposing stems on one shared notehead indicate striking one instrument with two sticks.
	it.concurrent('perc-double-stem-two-sticks (p. 293): shares one notehead between opposing stems on a single line', async () => {
		const e = await engrave(
			'percussion-two-players',
			'perc-double-stem-two-sticks',
		);
		const space = e.space(2, 0);
		const heads = e
			.inMeasure('notehead', 2, 0)
			.sort((a, b) => a.box.x - b.box.x);
		const stems = e.inMeasure('stem', 2, 0).sort((a, b) => a.box.x - b.box.x);
		for (const h of heads) {
			markBox(e, h.box, 'head');
		}
		for (const s of stems) {
			markBox(e, s.box, 'stem');
		}
		// Cluster noteheads by x to verify the two voices share one horizontal position per beat.
		const clusters: number[] = [];
		for (const h of heads) {
			const cx = h.box.x + h.box.w / 2;
			const last = clusters[clusters.length - 1];
			if (last === undefined || Math.abs(cx - last) > 0.35 * space) {
				clusters.push(cx);
			}
		}
		const lineY = must(e.lines(2, 0)[2], 'M3 single stave line');
		const upStems = stems.filter((s) => s.box.y + s.box.h / 2 < lineY).length;
		const downStems = stems.filter((s) => s.box.y + s.box.h / 2 > lineY).length;

		expect(
			e.check({
				headClusters: clusters.length,
				upStems,
				downStems,
			}),
		).toMatchMeasurements({
			headClusters: 2,
			upStems: 2,
			downStems: 2,
		});
	});

	// Unbroken percussion rolls take solid ties clear of tremolo strokes and accents.
	it.concurrent('perc-unbroken-roll-ties (p. 294): draws solid ties clear of tremolo strokes and accents on unbroken rolls', async () => {
		const e = await engrave('percussion-rolls', 'perc-unbroken-roll-ties');
		const ties = e.of('tie');
		const tremolos = e.of('tremolo');
		const accents = e.inMeasure('accent', 2, 0);
		for (const t of ties) {
			markBox(e, t.box, 'tie');
		}
		for (const tr of tremolos) {
			markBox(e, tr.box, 'tremolo');
		}
		for (const ac of accents) {
			markBox(e, ac.box, 'accent');
		}
		const tieHitsTremolo = ties.some((t) =>
			tremolos.some((tr) => boxesOverlap(t.box, tr.box)),
		);
		const accentHitsTie = accents.some((ac) =>
			ties.some((t) => boxesOverlap(ac.box, t.box)),
		);
		expect(
			e.check({
				hasTies: ties.length >= 4,
				hasTremolos: tremolos.length >= 6,
				hasAccent: accents.length === 1,
				tieHitsTremolo,
				accentHitsTie,
			}),
		).toMatchMeasurements({
			hasTies: true,
			hasTremolos: true,
			hasAccent: true,
			tieHitsTremolo: false,
			accentHitsTie: false,
		});
	});

	// Rim shots use differentiated circled and circled-cross noteheads distinct from normal and x heads.
	// fix: #4747
	it.todo('perc-rim-shot-noteheads (p. 295): draws circled notehead distinct from oval head', async () => {
		await engrave('percussion-rimshots', 'perc-rim-shot-noteheads');
	});

	// Timpani glissandos pair glissando lines with slurs (struck) or tremolo strokes (rolled).
	it.concurrent('perc-timpani-glissando (p. 296): draws struck glissandos with slurs and rolled glissandos with tremolos', async () => {
		const e = await engrave('percussion-timpani', 'perc-timpani-glissando');
		const m1Gliss = e.inMeasure('glissando', 0, 0);
		const m1Slurs = e.inMeasure('slur', 0, 0);
		const m2Gliss = e.inMeasure('glissando', 1, 0);
		const m2Trem = e.inMeasure('tremolo', 1, 0);
		for (const g of [...m1Gliss, ...m2Gliss]) {
			markBox(e, g.box, 'gliss');
		}
		for (const s of m1Slurs) {
			markBox(e, s.box, 'slur');
		}
		for (const tr of m2Trem) {
			markBox(e, tr.box, 'tremolo');
		}
		const slurHitsGliss = m1Slurs.some((s) =>
			m1Gliss.some((g) => s.overlaps(g)),
		);
		const tremHitsGliss = m2Trem.some((tr) =>
			m2Gliss.some((g) => tr.overlaps(g)),
		);
		expect(
			e.check({
				m1Gliss: m1Gliss.length,
				m1Slurs: m1Slurs.length,
				m2Gliss: m2Gliss.length,
				m2Trem: m2Trem.length,
				slurHitsGliss,
				tremHitsGliss,
			}),
		).toMatchMeasurements({
			m1Gliss: 2,
			m1Slurs: 2,
			m2Gliss: 1,
			m2Trem: 6,
			slurHitsGliss: false,
			tremHitsGliss: false,
		});
	});

	// Beamed drum grace groups take notehead-side slurs for closed strokes and none for open strokes.
	it.concurrent('perc-drum-grace-slurs (p. 297): curves closed-stroke grace slurs on the notehead side below up-stems', async () => {
		const e = await engrave('percussion-drums', 'perc-drum-grace-slurs');
		const m1Slurs = e.inMeasure('slur', 0, 0).sort((a, b) => a.box.x - b.box.x);
		const m2Slurs = e.inMeasure('slur', 1, 0);
		const mainNotes = e.notes.filter((n) => n.measure === 0 && !n.grace);
		for (const s of m1Slurs) {
			markBox(e, s.box, 'grace slur');
		}
		const belowNoteheads = m1Slurs.every((s, i) => {
			const main = mainNotes[i];
			return main ? s.box.y + s.box.h / 2 > main.cy : false;
		});
		expect(
			e.check({
				m1Slurs: m1Slurs.length,
				m2Slurs: m2Slurs.length,
				belowNoteheads,
			}),
		).toMatchMeasurements({
			m1Slurs: 2,
			m2Slurs: 0,
			belowNoteheads: true,
		});
	});

	// Hi-hat open (o), damped (+), and half-open symbols sit above crossed noteheads clear of ink.
	it.concurrent('perc-hi-hat-symbols (p. 298): places open, stopped, and half-muted symbols above crossed hi-hat noteheads', async () => {
		const e = await engrave('percussion-cymbals', 'perc-hi-hat-symbols');
		const heads = e
			.inMeasure('notehead', 0, 0)
			.sort((a, b) => a.box.x - b.box.x);
		const topLine = must(e.lines(0, 0)[0], 'M1 top stave line');
		const space = e.space(0, 0);
		const opens = e
			.inMeasure('brass-open', 0, 0)
			.sort((a, b) => a.box.x - b.box.x);
		const halfMuted = e
			.inMeasure('half-muted', 0, 0)
			.sort((a, b) => a.box.x - b.box.x);
		const stopped = e
			.inMeasure('stopped', 0, 0)
			.sort((a, b) => a.box.x - b.box.x);
		for (const m of stopped) {
			markBox(e, m.box, 'stopped');
		}
		const beat1Head = must(heads[0], 'beat 1 open hi-hat');
		const beat2Head = must(heads[1], 'beat 2 closed hi-hat');
		const beat3Head = must(heads[2], 'beat 3 half-muted hi-hat');
		const beat4Head = must(heads[3], 'beat 4 closed hi-hat');
		const openMark = must(opens[0], 'open hi-hat mark');
		const halfMutedMark = must(halfMuted[0], 'half-muted hi-hat mark');
		markBox(e, openMark.box, 'open');
		markBox(e, halfMutedMark.box, 'half-muted');
		const openAndHalfAbove =
			opens.length === 1 &&
			halfMuted.length === 1 &&
			openMark.box.y < topLine - 1.4 * space &&
			openMark.box.y + openMark.box.h / 2 < beat1Head.box.y &&
			!openMark.overlaps(beat1Head) &&
			halfMutedMark.box.y < topLine - 1.4 * space &&
			halfMutedMark.box.y + halfMutedMark.box.h / 2 < beat3Head.box.y &&
			!halfMutedMark.overlaps(beat3Head);
		const firstStopped = must(stopped[0], 'first stopped mark');
		const secondStopped = must(stopped[1], 'second stopped mark');
		const stoppedAboveClear =
			stopped.length === 2 &&
			firstStopped.box.y + firstStopped.box.h / 2 < beat2Head.box.y &&
			!firstStopped.overlaps(beat2Head) &&
			secondStopped.box.y + secondStopped.box.h / 2 < beat4Head.box.y &&
			!secondStopped.overlaps(beat4Head);
		expect(
			e.check({
				openAndHalfAbove,
				stoppedAboveClear,
			}),
		).toMatchMeasurements({
			openAndHalfAbove: true,
			stoppedAboveClear: true,
		});
	});
});

function boxesOverlap(a: Box, b: Box): boolean {
	return (
		a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
	);
}

/** Stem direction of an ink stem relative to its nearest notehead in the same measure/part. */
function inkStemDirections(
	e: Engraving,
	measure: number,
	part: number,
): { head: Ink; stem: Ink; dir: 'up' | 'down' }[] {
	const heads = e
		.inMeasure('notehead', measure, part)
		.sort((a, b) => a.box.x - b.box.x);
	const stems = e
		.inMeasure('stem', measure, part)
		.sort((a, b) => a.box.x - b.box.x);
	const space = e.space(measure, part);
	const out: { head: Ink; stem: Ink; dir: 'up' | 'down' }[] = [];
	for (const head of heads) {
		const hcx = head.box.x + head.box.w / 2;
		const hcy = head.box.y + head.box.h / 2;
		const match = stems
			.filter((s) => Math.abs(s.box.x + s.box.w / 2 - hcx) <= 1.2 * space)
			.sort(
				(a, b) =>
					Math.abs(a.box.x + a.box.w / 2 - hcx) -
					Math.abs(b.box.x + b.box.w / 2 - hcx),
			)[0];
		if (!match) {
			continue;
		}
		const scy = match.box.y + match.box.h / 2;
		out.push({ head, stem: match, dir: scy < hcy ? 'up' : 'down' });
	}
	return out;
}
