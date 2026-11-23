import type { Image } from '@vexml/renderer';
import { collectEngraving } from './engraving-collect';
import { Engraving } from './engraving-model';
import { testing } from './setup';

/** Renders one of the engraving fixtures and reads its geometry. */
export async function engrave(file: string): Promise<Engraving> {
	const { result, image } = await testing.eval(
		`engraving/${file}.musicxml`,
		{},
		collectEngraving,
	);
	return new Engraving(result, { rule: file, image });
}

/** Renders one of the engraving fixtures for its screenshot. */
export async function draw(file: string): Promise<Image> {
	const { image } = await testing.eval(
		`engraving/${file}.musicxml`,
		{},
		collectEngraving,
	);
	return image;
}

/** A length in stave-spaces, to the nearest quarter: the unit Behind Bars measures in. */
export function quarters(px: number, space: number): number {
	return Math.round((px / space) * 4) / 4;
}
