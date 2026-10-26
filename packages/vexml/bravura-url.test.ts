import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create, type Font } from 'fontkit';
import {
	BRAVURA_COMMON_RANGE,
	BRAVURA_COMMON_URL,
	BRAVURA_REST_RANGE,
	BRAVURA_URL,
} from './bravura-url';

describe('BRAVURA_URL', () => {
	it('points at the face vexflow embeds, byte for byte', async () => {
		const shipped = await Bun.file(fileURLToPath(BRAVURA_URL)).bytes();
		expect(shipped.length).toBeGreaterThan(0);
		expect(Buffer.from(shipped).equals(await vexflowBravura())).toBe(true);
	});
});

describe('BRAVURA_COMMON_URL', () => {
	it('holds exactly the glyphs of the whole face in BRAVURA_COMMON_RANGE', async () => {
		const whole = await face(BRAVURA_URL);
		const common = await face(BRAVURA_COMMON_URL);
		const covered = codepoints(BRAVURA_COMMON_RANGE);
		const expected = whole.characterSet.filter((c) => covered.has(c));
		// fontkit lists the 0xFFFF that ends a cmap's last segment, which maps to no glyph.
		const held = common.characterSet.filter((c) => c !== 0xffff);
		expect(held.toSorted((a, b) => a - b)).toEqual(
			expected.toSorted((a, b) => a - b),
		);
		const outlines = (font: Font) =>
			expected.map((c) => font.glyphForCodePoint(c).path.toSVG());
		expect(outlines(common)).toEqual(outlines(whole));
	});
});

describe('BRAVURA_REST_RANGE', () => {
	it('covers every codepoint BRAVURA_COMMON_RANGE leaves out, and none it covers', () => {
		const common = codepoints(BRAVURA_COMMON_RANGE);
		const rest = codepoints(BRAVURA_REST_RANGE);
		expect(common.size + rest.size).toBe(0x110000);
		expect([...rest].filter((c) => common.has(c))).toEqual([]);
	});
});

async function face(url: string): Promise<Font> {
	const bytes = await Bun.file(fileURLToPath(url)).bytes();
	return create(Buffer.from(bytes)) as Font;
}

/* A CSS unicode-range of plain codepoints and ranges, as a set. */
function codepoints(range: string): Set<number> {
	const set = new Set<number>();
	for (const part of range.split(',')) {
		const [from = '', to = from] = part.trim().slice(2).split('-');
		for (let c = parseInt(from, 16); c <= parseInt(to, 16); c++) {
			set.add(c);
		}
	}
	return set;
}

// vexflow's exports hide its font modules, so read the base64 off disk beside core.
async function vexflowBravura(): Promise<Buffer> {
	const core = fileURLToPath(import.meta.resolve('vexflow/core'));
	const module = await Bun.file(
		path.resolve(path.dirname(core), '../src/fonts/bravura.js'),
	).text();
	return Buffer.from(
		module.match(/base64,([A-Za-z0-9+/=]+)/)?.[1] ?? '',
		'base64',
	);
}
