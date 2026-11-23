import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs, FakePs } from 'core/system/testing';
import { fix } from './fix';

const VET =
	'vet/bin/vet check --since main --changed-lines --disable-over-budget';

async function setup({ withVet = true } = {}) {
	const fs = new FakeFs();
	const ps = new FakePs();
	ps.setCwd('/repo/vexml');
	if (withVet) {
		await fs.write('/repo/vet/bin/vet', '');
	}
	return {
		ps,
		fs,
		log: new MemoryLogger(),
	};
}

describe('fix', () => {
	it('writes fixes, typechecks every package, validates XML, then runs vet from the mono root', async () => {
		const { ps, fs, log } = await setup();

		await fix({ check: false, codeOnly: false, fs, log, ps });

		expect(ps.getCalls()).toEqual([
			'bunx biome check --write --unsafe .',
			'bunx tsc --noEmit -p packages/benchmarks/tsconfig.json',
			'bunx tsc --noEmit -p packages/integration/tsconfig.json',
			'bunx tsc --noEmit -p packages/renderer/tsconfig.json',
			'bunx tsc --noEmit -p packages/site/tsconfig.json',
			'bunx tsc --noEmit -p packages/vex/tsconfig.json',
			'bunx tsc --noEmit -p packages/vexml/tsconfig.json',
			'./packages/vex/xmllint/validate.sh',
			VET,
		]);
		expect(ps.getCallDirs().at(-1)).toBe('/repo');
	});

	it('reports without writing when given --check', async () => {
		const { ps, fs, log } = await setup();

		await fix({ check: true, codeOnly: false, fs, log, ps });

		expect(ps.getCalls()[0]).toBe('bunx biome check .');
	});

	it('turns both models off when given --code-only', async () => {
		const { ps, fs, log } = await setup();

		await fix({ check: false, codeOnly: true, fs, log, ps });

		expect(ps.getCalls().at(-1)).toBe(`${VET} --disable som --disable llm`);
		expect(ps.getCallDirs().at(-1)).toBe('/repo');
	});

	it('skips vet when vet/bin/vet is absent, as in the public mirror', async () => {
		const { ps, fs, log } = await setup({ withVet: false });

		await fix({ check: false, codeOnly: false, fs, log, ps });

		expect(ps.getCalls().at(-1)).toBe('./packages/vex/xmllint/validate.sh');
	});

	it('fails when vet fails', async () => {
		const { ps, fs, log } = await setup();
		// Pass biome (1), 6 tsc runs (2..7), xmllint (8), then fail vet (9).
		ps.simulate(async () => (ps.getCalls().length === 9 ? 1 : 0));

		await expect(
			fix({ check: false, codeOnly: false, fs, log, ps }),
		).rejects.toThrow('vet failed');
	});
});
