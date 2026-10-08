import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAVURA_URL } from './bravura-url';

describe('BRAVURA_URL', () => {
	it('points at the face vexflow embeds, byte for byte', async () => {
		const shipped = await Bun.file(fileURLToPath(BRAVURA_URL)).bytes();
		expect(shipped.length).toBeGreaterThan(0);
		expect(Buffer.from(shipped).equals(await vexflowBravura())).toBe(true);
	});
});

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
