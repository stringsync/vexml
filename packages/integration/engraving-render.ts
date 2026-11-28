import type { Image } from '@vexml/renderer';
import { collectEngraving } from './engraving-collect';
import { writeGeometry } from './engraving-geometry';
import { Engraving } from './engraving-model';
import { testing } from './setup';

/** Renders one of the engraving fixtures and reads its geometry. */
export async function engrave(file: string, rule = file): Promise<Engraving> {
	const { result, image } = await testing.eval(
		`engraving/${file}.musicxml`,
		{},
		collectEngraving,
	);
	const engraving = new Engraving(result, { rule, image });
	writeGeometry(file, engraving);
	return engraving;
}

/** Renders one of the engraving fixtures for its screenshot. */
export async function draw(file: string): Promise<Image> {
	const { result, image } = await testing.eval(
		`engraving/${file}.musicxml`,
		{},
		collectEngraving,
	);
	writeGeometry(file, new Engraving(result));
	return image;
}

/** A length in stave-spaces, to the nearest quarter: the unit Behind Bars measures in. */
export function quarters(px: number, space: number): number {
	// `|| 0` turns a rounded -0 into 0, which `toMatchMeasurements` tells apart.
	return Math.round((px / space) * 4) / 4 || 0;
}

/** Throws unless the value is there; for the notes and inks a fixture is known to hold. */
export function must<T>(value: T | undefined | null, what: string): T {
	if (value === undefined || value === null) {
		throw new Error(`the fixture has no ${what}`);
	}
	return value;
}
