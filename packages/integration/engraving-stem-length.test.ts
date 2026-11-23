import { describe, expect, it } from 'bun:test';
import { stemLength } from './engraving-model';
import { draw, engrave, quarters } from './engraving-render';

// Behind Bars p. 14, stem-length (ENGRAVING.md): a stem is an octave long, 3½ stave-spaces
// from the centre of its notehead. stem-length.musicxml is a treble stave in 4/4 that leaves
// every <stem> unset: M1 C5 D5 E5 F5 (down-stems), M2 A4 G4 E4 C4 (up-stems).

describe('stem-length (Behind Bars p. 14)', () => {
	it.concurrent('draws stem-length', async () => {
		expect(await draw('stem-length')).toMatchScreenshot(
			'engraving_stem-length.png',
		);
	});

	it.concurrent('draws stems 3½ spaces long (p. 14)', async () => {
		expect(await stemLengths('stem-length')).toMatchMeasurements([
			[3.5, 3.5, 3.5, 3.5],
			[3.5, 3.5, 3.5, 3.5],
		]);
	});
});

/** Every measure's stem lengths, in quarter stave-spaces. */
async function stemLengths(file: string) {
	const e = await engrave(file);
	return e.check(
		e.measures.map((m) =>
			e.headsIn(m).map((n) => quarters(stemLength(n), e.space(m))),
		),
	);
}
