import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars vocal sounds, falsetto, and speech notation (pp. 455–458)', () => {
	it.concurrent('draws humming +, falsetto harmonic circles, crossed spoken noteheads, and headless speech stems', async () => {
		expect(await draw('vocal-sounds')).toMatchScreenshot(
			'engraving_vocal-sounds.png',
		);
	});

	it.concurrent('vocal-humming-stopped-above (p. 455): places closed-mouth + symbols above the stave', async () => {
		const e = await engrave('vocal-sounds', 'vocal-humming-stopped-above');
		const topLine = must(e.lines(0)[0], 'top stave line');
		const space = e.space(0);
		const noteheads = e
			.inMeasure('notehead', 0)
			.sort((a, b) => a.box.x - b.box.x);
		expect(noteheads.length).toBeGreaterThanOrEqual(4);
		const stopped = e.inMeasure('stopped', 0).sort((a, b) => a.box.x - b.box.x);
		expect(stopped).toHaveLength(2);
		const targets = [
			must(noteheads[1], 'beat 2 notehead'),
			must(noteheads[2], 'beat 3 notehead'),
		];
		const ok = targets.map((note, i) => {
			const mark = must(stopped[i], `stopped ${i + 1}`);
			markBox(e, mark.box, i === 0 ? 'A4 with + above' : 'D5 with + above');
			return (
				bottomEdge(mark.box) < topLine &&
				Math.abs(centre(mark.box) - centre(note.box)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('vocal-falsetto-harmonic-circle (p. 456): places a harmonic circle above each bare <harmonic/> notehead', async () => {
		const e = await engrave('vocal-sounds', 'vocal-falsetto-harmonic-circle');
		const top = must(e.lines(1)[0], 'top stave line');
		const space = e.space(1);
		const heads = e.headsIn(1);
		const circles = e
			.inMeasure('harmonic-circle', 1)
			.sort((a, b) => a.box.x - b.box.x);
		expect(heads).toHaveLength(4);
		expect(circles).toHaveLength(4);
		const ok = circles.map((circle, i) => {
			markBox(e, circle.box, `Harm ${i + 1}`);
			const head = must(heads[i], `head ${i + 1}`);
			return (
				bottomEdge(circle.box) < top &&
				bottomEdge(circle.box) < head.head.y &&
				Math.abs(centre(circle.box) - centre(head.head)) <= 0.5 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('vocal-spoken-crossed-noteheads (p. 457): draws crossed noteheads at written heights with stems attached', async () => {
		const e = await engrave('vocal-sounds', 'vocal-spoken-crossed-noteheads');
		const heads = e.headsIn(2);
		expect(heads).toHaveLength(4);
		for (const [i, n] of heads.entries()) {
			markBox(e, n.head, `x-head ${i + 1}`);
		}
		const [e4, a4, d5, g4] = heads;
		const heightsOrdered =
			must(e4, 'E4').cy > must(a4, 'A4').cy &&
			must(a4, 'A4').cy > must(d5, 'D5').cy &&
			must(g4, 'G4').cy > must(a4, 'A4').cy;
		const allStemmed = e.inMeasure('stem', 2).length === 4;
		expect(e.check([heightsOrdered, allStemmed])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('vocal-speech-headless-stems (p. 458): draws headless beamed stems above the spoken lyrics', async () => {
		const e = await engrave('vocal-sounds', 'vocal-speech-headless-stems');
		const space = e.space(3);
		const noteheads = e.inMeasure('notehead', 3);
		const stems = e.inMeasure('stem', 3).sort((a, b) => a.box.x - b.box.x);
		const beams = e.inMeasure('beam', 3);
		expect(noteheads).toHaveLength(0);
		expect(stems).toHaveLength(4);
		expect(beams).toHaveLength(1);
		const beam = must(beams[0], 'speech beam');
		markBox(e, beam.box, 'beam');
		const joined = stems.map((stem, i) => {
			markBox(e, stem.box, `stem ${i + 1}`);
			const stemBottom = bottomEdge(stem.box);
			return (
				stemBottom >= beam.box.y - 0.15 * space &&
				stemBottom <= bottomEdge(beam.box) + 0.15 * space &&
				centre(stem.box) >= beam.box.x - 0.15 * space &&
				centre(stem.box) <= beam.box.x + beam.box.w + 0.15 * space
			);
		});
		expect(e.check([noteheads.length === 0, ...joined])).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
		]);
	});
});
