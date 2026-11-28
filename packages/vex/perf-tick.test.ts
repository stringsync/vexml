import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import type { SpawnCaptureResult, SpawnOptions } from 'core/system';
import { FakeFs, FakePs } from 'core/system/testing';
import { PERF_DUE_SIGNAL, perfTick } from './perf-tick';

const REPO = '/repo';
const VEXML = '/repo/vexml';
const COMMON = '/repo/.git';
const STATE = `${COMMON}/splates/vexml-perf-counter.json`;

describe('perfTick', () => {
	it('seeds state on first --fire run without firing', async () => {
		const env = makeEnv({ head: 'aaaa11110000' });
		await perfTick({
			every: 10,
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(
			env.ps.getCalls().some((c) => c.includes('splates signal fire')),
		).toBe(false);
		const saved = JSON.parse(await env.fs.read(STATE));
		expect(saved).toEqual({
			commit: 'aaaa11110000',
			count: 0,
			lastFiredCommit: 'aaaa11110000',
			lastFiredAt: null,
		});
	});

	it('increments count when vexml/ changed and leaves it unchanged otherwise', async () => {
		const env = makeEnv({
			head: 'bbbb22220000',
			diffFrom: 'aaaa11110000',
			diffOutput: 'vexml/packages/vexml/score.ts\n',
		});
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'aaaa11110000',
				count: 3,
				lastFiredCommit: '000011110000',
				lastFiredAt: null,
			}),
		);
		await perfTick({
			every: 10,
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(JSON.parse(await env.fs.read(STATE))).toEqual({
			commit: 'bbbb22220000',
			count: 4,
			lastFiredCommit: '000011110000',
			lastFiredAt: null,
		});

		const env2 = makeEnv({
			head: 'cccc33330000',
			diffFrom: 'bbbb22220000',
			diffOutput: '',
		});
		await env2.fs.write(STATE, await env.fs.read(STATE));
		await perfTick({
			every: 10,
			fire: true,
			force: false,
			seed: false,
			...env2,
		});
		expect(env2.ps.getExitCode()).toBe(0);
		expect(JSON.parse(await env2.fs.read(STATE))).toEqual({
			commit: 'cccc33330000',
			count: 4,
			lastFiredCommit: '000011110000',
			lastFiredAt: null,
		});
	});

	it('fires vexml.perf-due on the 10th vexml landing and resets count to 0', async () => {
		const env = makeEnv({
			head: 'dddd44440000',
			diffFrom: 'cccc33330000',
			diffOutput: 'vexml/packages/vexml/layout-planner.ts\n',
		});
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'cccc33330000',
				count: 9,
				lastFiredCommit: '000011110000',
				lastFiredAt: null,
			}),
		);
		await perfTick({
			every: 10,
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		const fireCall = env.ps
			.getCalls()
			.find((c) => c.includes(`splates signal fire ${PERF_DUE_SIGNAL}`));
		expect(fireCall).toBeDefined();
		expect(fireCall).toContain('"from":"000011110000"');
		expect(fireCall).toContain('"to":"dddd44440000"');
		expect(fireCall).toContain('"count":10');

		const saved = JSON.parse(await env.fs.read(STATE)) as {
			commit: string;
			count: number;
			lastFiredCommit: string;
			lastFiredAt: string | null;
		};
		expect(saved.commit).toBe('dddd44440000');
		expect(saved.count).toBe(0);
		expect(saved.lastFiredCommit).toBe('dddd44440000');
		expect(typeof saved.lastFiredAt).toBe('string');
	});

	it('does not reset state when splates signal fire fails', async () => {
		const env = makeEnv({
			head: 'dddd44440000',
			diffFrom: 'cccc33330000',
			diffOutput: 'vexml/packages/vexml/layout-planner.ts\n',
			fireExitCode: 1,
		});
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'cccc33330000',
				count: 9,
				lastFiredCommit: '000011110000',
				lastFiredAt: null,
			}),
		);
		await perfTick({
			every: 10,
			fire: true,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(2);
		const saved = JSON.parse(await env.fs.read(STATE)) as { count: number };
		expect(saved.count).toBe(9);
	});

	it('supports --force with --fire to fire immediately', async () => {
		const env = makeEnv({ head: 'eeee55550000' });
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'eeee55550000',
				count: 2,
				lastFiredCommit: '000011110000',
				lastFiredAt: null,
			}),
		);
		await perfTick({
			every: 10,
			fire: true,
			force: true,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(
			env.ps
				.getCalls()
				.some((c) => c.includes(`splates signal fire ${PERF_DUE_SIGNAL}`)),
		).toBe(true);
		const saved = JSON.parse(await env.fs.read(STATE)) as { count: number };
		expect(saved.count).toBe(0);
	});

	it('reports status in probe mode without mutating state', async () => {
		const env = makeEnv({
			head: 'ffff66660000',
			diffFrom: 'eeee55550000',
			diffOutput: 'vexml/packages/vexml/score.ts\n',
		});
		const initial = JSON.stringify({
			commit: 'eeee55550000',
			count: 4,
			lastFiredCommit: '000011110000',
			lastFiredAt: null,
		});
		await env.fs.write(STATE, initial);
		await perfTick({
			every: 10,
			fire: false,
			force: false,
			seed: false,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(1);
		expect(JSON.parse(String(env.log.entries[0]?.message ?? ''))).toEqual({
			from: '000011110000',
			to: 'ffff66660000',
			count: 5,
			every: 10,
			due: false,
		});
		expect(await env.fs.read(STATE)).toBe(initial);
	});

	it('rejects --seed combined with --fire', async () => {
		const env = makeEnv({ head: 'aaaa11110000' });
		await expect(
			perfTick({
				every: 10,
				fire: true,
				force: false,
				seed: true,
				...env,
			}),
		).rejects.toThrow('--seed and --fire are incompatible');
	});
});

class StubPs extends FakePs {
	private readonly stubs: Array<{
		prefix: string;
		result: SpawnCaptureResult;
	}> = [];

	when(prefix: string, result: SpawnCaptureResult): void {
		this.stubs.push({ prefix, result });
	}

	override async spawnCapture(
		argv: string[],
		opts?: SpawnOptions,
	): Promise<SpawnCaptureResult> {
		const cmd = argv.join(' ');
		const match = this.stubs.find((s) => cmd.startsWith(s.prefix));
		await super.spawnCapture(argv, opts);
		if (match) {
			return match.result;
		}
		return { exitCode: 0, stdout: '', stderr: '' };
	}
}

interface EnvOptions {
	head: string;
	diffFrom?: string;
	diffOutput?: string;
	fireExitCode?: number;
}

function makeEnv(opts: EnvOptions) {
	const fs = new FakeFs();
	const ps = new StubPs();
	ps.setCwd(VEXML);
	const log = new MemoryLogger();

	ps.when('git rev-parse --show-toplevel', {
		exitCode: 0,
		stdout: `${REPO}\n`,
		stderr: '',
	});
	ps.when('git rev-parse --git-common-dir', {
		exitCode: 0,
		stdout: `${COMMON}\n`,
		stderr: '',
	});
	ps.when('git rev-parse HEAD', {
		exitCode: 0,
		stdout: `${opts.head}\n`,
		stderr: '',
	});
	if (opts.diffFrom !== undefined) {
		ps.when(
			`git -C ${REPO} diff --name-only ${opts.diffFrom}..${opts.head} -- vexml/`,
			{
				exitCode: 0,
				stdout: opts.diffOutput ?? '',
				stderr: '',
			},
		);
	}
	ps.when(`splates signal fire ${PERF_DUE_SIGNAL}`, {
		exitCode: opts.fireExitCode ?? 0,
		stdout: '',
		stderr: opts.fireExitCode ? 'signal failed' : '',
	});

	return { fs, ps, log };
}
