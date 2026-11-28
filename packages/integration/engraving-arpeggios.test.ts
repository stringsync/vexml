import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars arpeggiated chords', () => {
	it.concurrent('draws arpeggio wavy lines, direction arrows and a non-arpeggiate bracket', async () => {
		expect(await draw('arpeggios')).toMatchScreenshot(
			'engraving_arpeggios.png',
		);
	});

	it.concurrent('draws unbroken, broken and non-arpeggiated chords across two staves', async () => {
		expect(await draw('arpeggios-staves')).toMatchScreenshot(
			'engraving_arpeggios-staves.png',
		);
	});

	it.concurrent('arpeggio-design-and-placement (p. 131): places the wavy line left of accidentals, spanning the noteheads rather than the stem', async () => {
		const e = await engrave('arpeggios', 'arpeggio-design-and-placement');
		const m1 = e.measureRect(0);
		const chord = must(e.headsIn(0)[0], 'first chord');
		const chordInk = must(chord.ink, 'first chord ink');
		const accs = e.inMeasure('accidental', 0);
		const leftmostAccX = Math.min(...accs.map((a) => a.box.x));
		const space = e.space(0);
		markBox(e, chordInk, 'Arpeggiated chord');
		expect(
			e.check(chordInk.x > m1.x && chordInk.x < leftmostAccX - 0.25 * space),
		).toMatchMeasurements(true);
	});

	it.concurrent('arpeggio-direction-arrows (p. 131): draws plain, downward-arrow and upward-arrow arpeggio signs', async () => {
		const e = await engrave('arpeggios', 'arpeggio-direction-arrows');
		const heads = e.headsIn(1);
		// Three 3-note chords: indices 0, 3, 6 are each chord's bottom note.
		const chords = [0, 3, 6].map((i) => must(heads[i], `chord ${i}`));
		const space = e.space(1);
		const leftOfHeads = chords.map((c, i) => {
			const ink = must(c.ink, `chord ${i + 1} ink`);
			markBox(e, ink, `Chord ${i + 1}`);
			return ink.x < c.head.x - 0.5 * space;
		});
		expect(e.check(leftOfHeads)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('arpeggio-non-arpeggiate-bracket (p. 132): draws a single-stave bracket on beat 1 and one continuous bracket across both staves on beat 3', async () => {
		const e = await engrave(
			'arpeggios-staves',
			'arpeggio-non-arpeggiate-bracket',
		);
		const trebleHeads = e.headsIn(2, { part: 0, voice: '1' });
		// Measure 3 voice 1 has a 3-note chord on beat 1 (indices 0..2) and a 2-note chord on beat 3 (indices 3..4).
		const beat1 = must(trebleHeads[0], 'beat 1 chord');
		const beat3Treble = must(trebleHeads[3], 'beat 3 treble chord');
		const beat1Ink = must(beat1.ink, 'beat 1 chord ink');
		const botLine1 = must(e.lines(2, 0, 1).at(-1), 'staff 1 bottom');
		const topLine2 = must(e.lines(2, 0, 2)[0], 'staff 2 top');
		const crossing = e.inks.filter(
			(i) =>
				i.box.x > beat1.head.x &&
				i.box.x < beat3Treble.head.x &&
				i.box.y < botLine1 &&
				i.box.y + i.box.h > topLine2,
		);
		markBox(e, beat1Ink, 'Single-stave bracket');
		for (const ink of crossing) {
			markBox(e, ink.box, 'Grand-staff bracket');
		}
		expect(
			e.check({
				singleStaveLeft: beat1Ink.x < beat1.head.x - 0.5 * e.space(2),
				grandStaffContinuous: crossing.length >= 1,
			}),
		).toMatchMeasurements({
			singleStaveLeft: true,
			grandStaffContinuous: true,
		});
	});

	it.concurrent('arpeggio-unbroken-two-staves (p. 132): draws one continuous wavy line spanning both staves', async () => {
		const e = await engrave('arpeggios-staves', 'arpeggio-unbroken-two-staves');
		const m1 = e.measureRect(0);
		const topChord = must(
			e.headsIn(0, { part: 0, voice: '1' })[0],
			'treble chord',
		);
		const botLine1 = must(e.lines(0, 0, 1).at(-1), 'staff 1 bottom');
		const topLine2 = must(e.lines(0, 0, 2)[0], 'staff 2 top');
		const crossing = e.inks.filter(
			(i) =>
				i.box.x > m1.x &&
				i.box.x < topChord.head.x &&
				i.box.y < botLine1 &&
				i.box.y + i.box.h > topLine2,
		);
		for (const ink of crossing) {
			markBox(e, ink.box, 'Unbroken arpeggio');
		}
		expect(e.check(crossing.length >= 1)).toMatchMeasurements(true);
	});

	it.concurrent('arpeggio-broken-two-staves (p. 132): draws separate arpeggio signs per stave, each close to its chord', async () => {
		const e = await engrave('arpeggios-staves', 'arpeggio-broken-two-staves');
		const treble1 = must(
			e.headsIn(1, { part: 0, voice: '1' })[0],
			'beat 1 treble',
		);
		const bass1 = must(e.headsIn(1, { part: 0, voice: '2' })[0], 'beat 1 bass');
		const treble1Ink = must(treble1.ink, 'beat 1 treble ink');
		const bass1Ink = must(bass1.ink, 'beat 1 bass ink');
		markBox(e, treble1Ink, 'Treble beat 1');
		markBox(e, bass1Ink, 'Bass beat 1');
		expect(
			e.check({
				trebleLeftOfBass: treble1Ink.x < bass1Ink.x - 0.5 * e.space(1),
				bassHasOwnArpeggio: bass1Ink.x < bass1.head.x - 0.5 * e.space(1),
			}),
		).toMatchMeasurements({
			trebleLeftOfBass: true,
			bassHasOwnArpeggio: true,
		});
	});
});
