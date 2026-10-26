import { beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type InkMask, renderers } from '@vexml/renderer';
import { InkMap } from '../vex/ink-map';

/** A mask replay must land on the pixels the complete render actually drew. */
describe('element ink masks', () => {
	let xml: string;
	beforeEach(() => {
		xml = readFileSync(join(import.meta.dir, '__data__/note.musicxml'), 'utf8');
	});
	it('vexml masks line up with a complete note render', async () => {
		const { image, result } = await renderers
			.vexml({ musicXML: xml })
			.eval((context) => context.inkMasks());
		const difference = compare(result, InkMap.fromPng(image));
		expect(result.length).toBeGreaterThan(0);
		expect(difference.pixels).toBeGreaterThan(50);
		expect(difference.outside).toBe(0);
	}, 30000);
	it('osmd masks line up with a complete note render', async () => {
		const { image, result } = await renderers
			.osmd({ musicXML: xml })
			.eval((context) => context.inkMasks());
		const difference = compare(result, InkMap.fromPng(image));
		expect(result.length).toBeGreaterThan(0);
		expect(difference.pixels).toBeGreaterThan(50);
		expect(difference.outside).toBe(0);
	}, 30000);
	it('alphatab masks line up with a complete note render', async () => {
		const { image, result } = await renderers
			.alphatab({ musicXML: xml })
			.eval((context) => context.inkMasks());
		const difference = compare(result, InkMap.fromPng(image));
		expect(result.length).toBeGreaterThan(0);
		expect(difference.pixels).toBeGreaterThan(50);
		expect(difference.outside).toBe(0);
	}, 30000);
});

function compare(
	masks: InkMask[],
	ink: InkMap,
): { pixels: number; outside: number } {
	let pixels = 0,
		outside = 0;
	for (const mask of masks) {
		for (let i = 0; i < mask.runs.length; i += 2) {
			const start = mask.runs[i] ?? 0,
				end = start + (mask.runs[i + 1] ?? 0);
			for (let p = start; p < end; p++) {
				pixels++;
				if (
					!ink.isInk(
						mask.x + (p % mask.width),
						mask.y + Math.floor(p / mask.width),
					)
				) {
					outside++;
				}
			}
		}
	}
	return { pixels, outside };
}
