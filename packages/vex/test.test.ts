import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs, FakePs } from 'core/system/testing';
import { test } from './test';

/** What ran after the Docker check, which every run makes first. */
function calls(ps: FakePs) {
	return ps.getCalls().filter((call) => call !== 'docker info');
}

async function setup() {
	const fs = new FakeFs();
	const ps = new FakePs();
	ps.setCwd('/repo');
	await fs.write('/package.json', '{"workspaces":["*/packages/*"]}');
	return {
		ps,
		opts: {
			update: false,
			clean: false,
			log: new MemoryLogger(),
			fs,
			ps,
		},
		fs,
	};
}

describe('test', () => {
	it('builds from the root of its workspace', async () => {
		const { ps, opts, fs } = await setup();
		await fs.write('/package.json', '{"workspaces":["*/packages/*"]}');
		await test(opts);
		expect(calls(ps)[0]).toEndWith('-f Dockerfile /');
	});

	it('builds from its own root in a mirror', async () => {
		const { ps, opts, fs } = await setup();
		await fs.write('/repo/package.json', '{"workspaces":["packages/*"]}');
		await test(opts);
		expect(calls(ps)[0]).toEndWith('-f Dockerfile /repo');
	});

	it('runs the image by a tag of its own', async () => {
		const { ps, opts } = await setup();
		await test(opts);
		const [build, run] = calls(ps);
		expect(build).toContain('-t vexml-tests -t vexml-tests:run-4242');
		expect(run).toEndWith(' vexml-tests:run-4242 --timeout 30000');
	});

	it('drops its tag once the run is over', async () => {
		const { ps, opts } = await setup();
		await test(opts);
		expect(calls(ps).at(-1)).toBe('docker image rm vexml-tests:run-4242');
	});

	it('drops its tag when the tests fail', async () => {
		const { ps, opts } = await setup();
		ps.simulate(async () => (calls(ps).length === 2 ? 1 : 0));
		await expect(test(opts)).rejects.toThrow('tests failed');
		expect(calls(ps).at(-1)).toBe('docker image rm vexml-tests:run-4242');
	});

	it('runs the shared tag as is when CI built it', async () => {
		const { ps, opts } = await setup();
		ps.setEnv({ VEX_TEST_SKIP_BUILD: '1' });
		await test(opts);
		const ran = calls(ps);
		expect(ran).toHaveLength(1);
		expect(ran[0]).toEndWith(' vexml-tests --timeout 30000');
	});

	it('mounts only the screenshot, diff, and mark folders of the integration package', async () => {
		const { ps, opts } = await setup();
		await test(opts);
		const run = calls(ps)[1];
		const base = '/repo/packages/integration';
		const target = '/app/vexml/packages/integration';
		expect(run).toContain(
			`-v ${base}/__screenshots__:${target}/__screenshots__`,
		);
		expect(run).toContain(`-v ${base}/__diffs__:${target}/__diffs__`);
		expect(run).toContain(`-v ${base}/__marks__:${target}/__marks__`);
		expect(run).not.toContain(`-v ${base}:`);
	});
});
