import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs, FakePs } from 'core/system/testing';
import {
	checkVexflow,
	VEXFLOW_SIGNAL,
	type VexflowRegistry,
} from './check-vexflow';

describe('checkVexflow', () => {
	it('emits update json and exits 0 in probe mode when a minor update exists', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		await checkVexflow({
			fire: false,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(JSON.parse(String(env.log.entries[0]?.message ?? ''))).toEqual({
			pinned: '5.0.0',
			latest: '5.9.0',
			majorBump: false,
		});
	});

	it('marks majorBump when the major version increases', async () => {
		const env = await makeCheckEnv('5.9.0', '6.0.0');
		await checkVexflow({
			fire: false,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(JSON.parse(String(env.log.entries[0]?.message ?? ''))).toEqual({
			pinned: '5.9.0',
			latest: '6.0.0',
			majorBump: true,
		});
	});

	it('exits 1 in probe mode when vexflow is already up to date', async () => {
		const env = await makeCheckEnv('5.9.0', '5.9.0');
		await checkVexflow({
			fire: false,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(1);
	});

	it('exits 2 when fetching the latest version fails', async () => {
		const env = await makeCheckEnv('5.0.0', new Error('registry offline'));
		await checkVexflow({
			fire: false,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(2);
		expect(env.log.entries.some((e) => e.level === 'error')).toBe(true);
	});

	it('fires the signal once and records state in --fire mode', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		await checkVexflow({
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		const fireCall = env.ps.getCalls()[1];
		expect(fireCall).toContain(`splates signal fire ${VEXFLOW_SIGNAL}`);
		expect(fireCall).toContain('"latest":"5.9.0"');
		const saved = JSON.parse(await env.fs.read(env.statePath)) as {
			version: string;
		};
		expect(saved.version).toBe('5.9.0');
	});

	it('skips firing when the same version was already signaled', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		await env.fs.write(
			env.statePath,
			JSON.stringify({ version: '5.9.0', firedAt: '2026-11-22T00:00:00.000Z' }),
		);
		await checkVexflow({
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(env.ps.getCalls()).toHaveLength(1);
	});

	it('fires again when a newer version arrives after an earlier signal', async () => {
		const env = await makeCheckEnv('5.0.0', '5.10.0');
		await env.fs.write(
			env.statePath,
			JSON.stringify({ version: '5.9.0', firedAt: '2026-11-22T00:00:00.000Z' }),
		);
		await checkVexflow({
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(env.ps.getCalls()[1]).toContain('"latest":"5.10.0"');
		const saved = JSON.parse(await env.fs.read(env.statePath)) as {
			version: string;
		};
		expect(saved.version).toBe('5.10.0');
	});

	it('fires despite recorded state when --force is passed', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		await env.fs.write(
			env.statePath,
			JSON.stringify({ version: '5.9.0', firedAt: '2026-11-22T00:00:00.000Z' }),
		);
		await checkVexflow({
			fire: true,
			force: true,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(env.ps.getCalls()[1]).toContain(
			`splates signal fire ${VEXFLOW_SIGNAL}`,
		);
	});

	it('leaves state untouched and exits 2 when splates signal fire fails', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		env.ps.simulate(async () => (env.ps.getCalls().length === 2 ? 1 : 0));
		await checkVexflow({
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(2);
		expect(await env.fs.exists(env.statePath)).toBe(false);
	});

	it('exits cleanly without firing when already up to date in --fire mode', async () => {
		const env = await makeCheckEnv('5.9.0', '5.9.0');
		await checkVexflow({
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(env.ps.getCalls()).toHaveLength(0);
	});

	it('records the current latest version without firing in --seed mode', async () => {
		const env = await makeCheckEnv('5.0.0', '5.9.0');
		await checkVexflow({
			fire: false,
			force: false,
			seed: true,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(env.ps.getCalls()).toHaveLength(1);
		const saved = JSON.parse(await env.fs.read(env.statePath)) as {
			version: string;
		};
		expect(saved.version).toBe('5.9.0');
	});
});

class FakeVexflowRegistry implements VexflowRegistry {
	constructor(private readonly result: string | Error) {}

	async latestVersion(): Promise<string> {
		if (this.result instanceof Error) {
			throw this.result;
		}
		return this.result;
	}
}

async function makeCheckEnv(pinned: string, latest: string | Error) {
	const fs = new FakeFs();
	const ps = new FakePs();
	const log = new MemoryLogger();
	ps.setCwd('/repo/vexml');
	ps.setCaptureOutput('/repo/.git\n', '');
	await fs.write(
		'/repo/vexml/packages/vexml/package.json',
		JSON.stringify({ dependencies: { vexflow: pinned } }),
	);
	return {
		fs,
		ps,
		log,
		registry: new FakeVexflowRegistry(latest),
		statePath: '/repo/.git/splates/vexflow-last-fired.json',
	};
}
