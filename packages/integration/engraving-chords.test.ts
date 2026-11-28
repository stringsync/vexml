import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import type { EngravedNote, Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';

describe('Behind Bars chords', () => {
	it.concurrent('draws single-stem chords, adjacent heads and altered unisons', async () => {
		expect(await draw('single-stem-chords')).toMatchScreenshot(
			'engraving_single-stem-chords.png',
		);
	});

	it.concurrent('draws simultaneous voices and a separate reference part', async () => {
		expect(await draw('double-stem-chords')).toMatchScreenshot(
			'engraving_double-stem-chords.png',
		);
	});

	it.concurrent('chord-one-stem (p. 47): shares a stem among equal values', async () => {
		const e = await engrave('single-stem-chords', 'chord-one-stem');
		const stems = ink(e, 1, 'stem');
		const notes = e.headsIn(0);
		expect(
			e.check(
				stems.length === 1 &&
					notes.length === 2 &&
					notes.every((note) => note.stem === stems[0]),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-stem-extreme (pp. 47–48): follows the outermost head', async () => {
		const e = await engrave('single-stem-chords', 'chord-stem-extreme');
		expect(e.check([1, 2].map((m) => directions(e, m)))).toMatchMeasurements([
			['up'],
			['down'],
		]);
	});

	it.concurrent('chord-stem-majority (p. 48): breaks a tie between outer heads by majority', async () => {
		const e = await engrave('single-stem-chords', 'chord-stem-majority');
		expect(e.check([3, 4].map((m) => directions(e, m)))).toMatchMeasurements([
			['up'],
			['down'],
		]);
	});

	it.concurrent('chord-adjacent-pair (pp. 48–49): keeps the lower head left', async () => {
		const e = await engrave('single-stem-chords', 'chord-adjacent-pair');
		expect(
			e.check([0, 2].map((start) => order(e, 7, start, 2))),
		).toMatchMeasurements([
			[0, 1],
			[0, 1],
		]);
	});

	it.concurrent('chord-adjacent-odd (p. 49): puts the majority on the ordinary side', async () => {
		const e = await engrave('single-stem-chords', 'chord-adjacent-odd');
		expect(
			e.check([0, 3].map((start) => order(e, 8, start, 3))),
		).toMatchMeasurements([
			[1, 0, 1],
			[0, 1, 0],
		]);
	});

	it.concurrent('chord-adjacent-even (p. 49): alternates from the left for both stem directions', async () => {
		const e = await engrave('single-stem-chords', 'chord-adjacent-even');
		expect(
			e.check([0, 4].map((start) => order(e, 9, start, 4))),
		).toMatchMeasurements([
			[0, 1, 0, 1],
			[0, 1, 0, 1],
		]);
	});

	it.concurrent('chord-adjacent-with-gap (p. 49): keeps an embedded second rising to the right', async () => {
		const e = await engrave('single-stem-chords', 'chord-adjacent-with-gap');
		expect(e.check(order(e, 17, 1, 2))).toMatchMeasurements([0, 1]);
	});

	it.concurrent('chord-adjacent-stemless (p. 50): offsets whole heads as for a stemmed second', async () => {
		const e = await engrave('single-stem-chords', 'chord-adjacent-stemless');
		expect(e.check(order(e, 10, 0, 2))).toMatchMeasurements([0, 1]);
	});

	it.concurrent('chord-unison-single-stem (p. 50): places heads on both sides of one stem', async () => {
		const e = await engrave('single-stem-chords', 'chord-unison-single-stem');
		const stems = ink(e, 11, 'stem');
		const heads = ink(e, 11, 'notehead')
			.map(({ box }) => centre(box))
			.sort((a, b) => a - b);
		const stem = stems[0]?.box;
		expect(
			e.check(
				stems.length === 1 &&
					heads.length === 2 &&
					!!stem &&
					(heads[0] ?? Infinity) < centre(stem) &&
					(heads[1] ?? -Infinity) > centre(stem),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-unison-single-stemless (p. 50): gives both members of a stemless unison a head', async () => {
		const e = await engrave(
			'single-stem-chords',
			'chord-unison-single-stemless',
		);
		const heads = ink(e, 15, 'notehead');
		expect(
			e.check(
				heads.length === 2 && distinct(heads.map(({ box }) => centre(box))),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-altered-unison-layout-choice: keeps altered dyads and clusters on compact shared stems', async () => {
		const e = await engrave(
			'single-stem-chords',
			'chord-altered-unison-layout-choice',
		);
		const cases = [
			{ measure: 12, heads: 2, signs: 2, stems: 1, decoration: 'flag' },
			{ measure: 13, heads: 4, signs: 3, stems: 1, decoration: 'flag' },
			{ measure: 18, heads: 3, signs: 2, stems: 2, decoration: 'beam' },
		];
		expect(
			e.check(
				cases.every(({ measure, heads, signs, stems, decoration }) => {
					const chord = e.headsIn(measure - 1);
					const accidentals = ink(e, measure, 'accidental');
					const shafts = ink(e, measure, 'stem');
					const left = Math.min(...chord.map(({ head }) => centre(head)));
					const chordHeads =
						measure === 18
							? chord.filter(({ pitch }) => pitch !== 'A/4')
							: chord;
					const right = Math.max(...chordHeads.map(({ head }) => centre(head)));
					const width = e.space(measure - 1);
					return (
						chord.length === heads &&
						accidentals.length === signs &&
						accidentals.every(({ box }) => box.x + box.w <= left) &&
						right - left <= 2.5 * width &&
						shafts.length === stems &&
						shafts.every(({ box }) => box.w <= 3) &&
						ink(e, measure, decoration).length === 1
					);
				}),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('packs stemless altered unisons after their accidentals', async () => {
		const e = await engrave('double-stem-chords');
		const heads = e.headsIn(12).map((note) => note.head);
		const first = must(heads[0], 'first cluster head');
		const signs = ink(e, 13, 'accidental');
		expect(heads).toHaveLength(3);
		expect(signs).toHaveLength(3);
		expect(signs.every(({ box }) => box.x + box.w <= first.x)).toBe(true);
		expect(ink(e, 13, 'bracket')).toHaveLength(0);
		expect(
			heads.slice(1).map((head, i) => {
				const previous = must(heads[i], 'preceding cluster head');
				const gap = head.x - (previous.x + previous.w);
				return Math.abs(gap) <= 1;
			}),
		).toEqual([true, true]);
	});

	it.concurrent('chord-cluster-stemless-alignment (p. 52): aligns the first head with the other stave', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-cluster-stemless-alignment',
		);
		const heads = e.headsIn(12);
		for (const note of heads) {
			markBox(e, note.head, 'Cluster head');
		}
		expect(
			e.check(
				heads.length === 3 &&
					aligned(
						Math.min(...heads.map((note) => centre(note.head))),
						referenceX(e, 13),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-voices-ordinary-alignment (p. 49): aligns undisplaced heads in both voices', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-ordinary-alignment',
		);
		expect(
			e.check(
				aligned(headX(voiceHead(e, 1, '1', 0)), headX(voiceHead(e, 1, '2', 1))),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-voices-adjacent-offset (pp. 49, 53): moves the lower chord right', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-adjacent-offset',
		);
		const upper = voiceHead(e, 2, '1', 0);
		const lower = voiceHead(e, 2, '2', 1);
		expect(e.check(offsets(e, 2, upper, lower))).toMatchMeasurements(true);
	});

	it.concurrent('chord-voices-stem-direction (pp. 47, 52): uses independent, opposing stems', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-stem-direction',
		);
		expect(
			e.check(
				[3, 11, 12].map((m) => {
					ink(e, m, 'stem');
					return ['1', '2'].map((voice) => {
						const notes = e.headsIn(m - 1, { voice });
						const stem = notes.find((note) => note.stem)?.stem?.box;
						return stem ? direction(stem, notes) : 'missing';
					});
				}),
			),
		).toMatchMeasurements([
			['up', 'down'],
			['up', 'down'],
			['up', 'down'],
		]);
	});

	it.concurrent('chord-voices-unison-stems (p. 52): retains both stems at a shared half note', async () => {
		const e = await engrave('double-stem-chords', 'chord-voices-unison-stems');
		const stems = ink(e, 4, 'stem');
		const notes = e.headsIn(3);
		expect(
			e.check(stems.map(({ box }) => direction(box, notes)).sort()),
		).toMatchMeasurements(['down', 'up']);
	});

	it.concurrent('chord-voices-black-unison (p. 52): reuses the black head across durations', async () => {
		const e = await engrave('double-stem-chords', 'chord-voices-black-unison');
		ink(e, 5, 'notehead');
		expect(
			e.check(
				aligned(headX(voiceHead(e, 5, '1')), headX(voiceHead(e, 5, '2'))),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-voices-stemless-unison (p. 52): separates two whole heads', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-stemless-unison',
		);
		const heads = ink(e, 6, 'notehead');
		expect(
			e.check(
				heads.length === 2 && distinct(heads.map(({ box }) => centre(box))),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('chord-voices-unlike-unison (pp. 52–53): separates and offsets unlike heads', async () => {
		const e = await engrave('double-stem-chords', 'chord-voices-unlike-unison');
		expect(
			e.check(
				[7, 8, 9].map((m) => {
					ink(e, m, 'notehead');
					const upper = headX(voiceHead(e, m, '1'));
					const lower = headX(voiceHead(e, m, '2'));
					return m === 7 ? lower > upper + 2 : distinct([lower, upper]);
				}),
			),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('chord-voices-whole-clearance (p. 53): keeps whole heads clear of the other stem', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-whole-clearance',
		);
		expect(
			e.check(
				[8, 9, 10].map((m) => {
					const stems = ink(e, m, 'stem');
					const whole = e.headsIn(m - 1).find((note) => note.beats === 4);
					const heads = ink(e, m, 'notehead');
					const xy = must(whole, 'whole head');
					const target = must(
						heads.find(
							({ box }) =>
								Math.abs(centre(box) - headX(xy)) <= 3 &&
								Math.abs(box.y + box.h / 2 - xy.cy) <= 3,
						)?.box,
						'whole note ink',
					);
					return (
						stems.length === 1 &&
						stems.every(
							({ box }) =>
								box.x > target.x + target.w ||
								box.x + box.w < target.x ||
								box.y > target.y + target.h ||
								box.y + box.h < target.y,
						)
					);
				}),
			),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('chord-voices-offset-alignment (p. 53): aligns another stave with the left head', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-offset-alignment',
		);
		expect(
			e.check(
				[7, 8, 9, 10].map((m) => {
					const heads = ink(e, m, 'notehead');
					return (
						heads.length === 2 &&
						aligned(
							Math.min(...heads.map(({ box }) => box.x)),
							referenceHead(e, m).x,
						)
					);
				}),
			),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('chord-voices-crossed-offset (p. 53): moves the crossed down-stem voice left', async () => {
		const e = await engrave(
			'double-stem-chords',
			'chord-voices-crossed-offset',
		);
		expect(
			e.check([11, 12].map((measure) => crossedOffset(e, measure))),
		).toMatchMeasurements([true, true]);
	});
});

function headX(note: EngravedNote): number {
	return centre(note.ink ?? note.head);
}

function aligned(a: number, b: number): boolean {
	return Math.abs(a - b) <= 2;
}

function distinct(xs: number[]): boolean {
	return Math.max(...xs) - Math.min(...xs) > 2;
}

function ink(e: Engraving, measure: number, kind: string) {
	const rect = e.measureRect(measure - 1);
	const top = must(e.lines(measure - 1)[0], 'top line');
	const bottom = must(e.lines(measure - 1).at(-1), 'bottom line');
	const padding = e.space(measure - 1) * 5;
	const nextPart = e.lines(measure - 1, 1)[0] ?? Infinity;
	const bottomLimit = Math.min((bottom + nextPart) / 2, bottom + padding);
	const items = e.of(kind).filter(({ box }) => {
		const y = box.y + box.h / 2;
		return (
			centre(box) >= rect.x &&
			centre(box) < rect.x + rect.w &&
			y >= top - padding &&
			y < bottomLimit
		);
	});
	for (const { box } of items) {
		markBox(e, box, `M${measure} ${kind}`);
	}
	return items;
}

function direction(stem: Box, notes: EngravedNote[]): string {
	const above = Math.min(...notes.map((n) => n.cy)) - stem.y;
	const below = stem.y + stem.h - Math.max(...notes.map((n) => n.cy));
	return above > below ? 'up' : 'down';
}

function directions(e: Engraving, measure: number) {
	const notes = e.headsIn(measure - 1);
	for (const note of notes) {
		markBox(e, note.head, `M${measure} ${note.pitch}`);
	}
	return ink(e, measure, 'stem').map(({ box }) => direction(box, notes));
}

function order(e: Engraving, measure: number, start: number, size: number) {
	const notes = e
		.headsIn(measure - 1)
		.slice(start, start + size)
		.sort((a, b) => b.cy - a.cy);
	const left = Math.min(...notes.map(headX));
	return notes.map((note) => {
		const side = aligned(headX(note), left) ? 0 : 1;
		markBox(
			e,
			note.ink ?? note.head,
			`M${measure} ${note.pitch}: ${side === 0 ? 'left' : 'right'}`,
		);
		return side;
	});
}

function voiceHead(e: Engraving, measure: number, voice: string, index = 0) {
	return must(
		e.headsIn(measure - 1, { voice })[index],
		`M${measure} voice ${voice} note`,
	);
}

function referenceX(e: Engraving, measure: number) {
	return centre(referenceHead(e, measure));
}

function referenceHead(e: Engraving, measure: number) {
	const note = must(e.headsIn(measure - 1, 1)[0], `M${measure} reference note`);
	const box = note.ink ?? note.head;
	markBox(e, box, `M${measure} reference head`);
	return box;
}

function crossedOffset(e: Engraving, measure: number): boolean {
	const stems = ink(e, measure, 'stem');
	const up = voiceHead(e, measure, '1');
	const down = voiceHead(e, measure, '2');
	const upStem = stems.find(({ box }) => direction(box, [up]) === 'up')?.box;
	const downStem = stems.find(
		({ box }) => direction(box, [down]) === 'down',
	)?.box;
	const upHeads = e.headsIn(measure - 1, { voice: '1' });
	const downHeads = e.headsIn(measure - 1, { voice: '2' });
	const upLeft = Math.min(...upHeads.map(({ head }) => head.x));
	const downRight = Math.max(...downHeads.map(({ head }) => head.x + head.w));
	// A lone crossed second may touch its neighbour; crossed chords
	// interleave several heads, so their parts must stand visibly apart.
	const chord = upHeads.length > 1 || downHeads.length > 1;
	const clearance = upLeft - downRight;
	markBox(
		e,
		up.head,
		`M${measure} up-stem part, ${clearance.toFixed(1)}px clear`,
	);
	return (
		stems.length === 2 &&
		!!upStem &&
		!!downStem &&
		headX(up) - headX(down) > 2 &&
		(chord ? clearance >= 2 : clearance > -1) &&
		upStem.x > downStem.x + downStem.w &&
		aligned(headX(down), referenceX(e, measure))
	);
}

function offsets(
	e: Engraving,
	measure: number,
	upper: EngravedNote,
	lower: EngravedNote,
): boolean {
	markBox(e, upper.ink ?? upper.head, 'Undisplaced head, upper voice');
	markBox(e, lower.ink ?? lower.head, 'Undisplaced head, lower voice');
	const reference = referenceX(e, measure);
	return headX(lower) > headX(upper) + 2 && aligned(headX(upper), reference);
}
