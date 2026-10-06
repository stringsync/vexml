import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'webappwiz/log';
import { FakeFs, FakePs } from 'webappwiz/system/testing';
import { test } from './test';

function setup() {
	const ps = new FakePs();
	ps.setCwd('/repo');
	return {
		ps,
		opts: {
			update: false,
			clean: false,
			log: new MemoryLogger(),
			fs: new FakeFs(),
			ps,
		},
	};
}

describe('test', () => {
	it('runs the image by a tag of its own', async () => {
		const { ps, opts } = setup();
		await test(opts);
		const [build, run] = ps.getCalls();
		expect(build).toContain('-t vexml-tests -t vexml-tests:run-4242');
		expect(run).toEndWith(' vexml-tests:run-4242');
	});

	it('drops its tag once the run is over', async () => {
		const { ps, opts } = setup();
		await test(opts);
		expect(ps.getCalls().at(-1)).toBe('docker image rm vexml-tests:run-4242');
	});

	it('drops its tag when the tests fail', async () => {
		const { ps, opts } = setup();
		ps.simulate(async () => (ps.getCalls().length === 2 ? 1 : 0));
		await expect(test(opts)).rejects.toThrow('tests failed');
		expect(ps.getCalls().at(-1)).toBe('docker image rm vexml-tests:run-4242');
	});

	it('runs the shared tag as is when CI built it', async () => {
		const { ps, opts } = setup();
		ps.setEnv({ VEX_TEST_SKIP_BUILD: '1' });
		await test(opts);
		const calls = ps.getCalls();
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEndWith(' vexml-tests');
	});
});
