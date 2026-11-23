import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakePs } from 'core/system/testing';
import { ensureDocker } from './docker';

const wait = { pause: async () => {}, attempts: 3 };

describe('ensureDocker', () => {
	it('starts nothing when the daemon answers', async () => {
		const ps = new FakePs();
		await ensureDocker({ ps, log: new MemoryLogger() }, wait);
		expect(ps.getCalls()).toEqual(['docker info']);
	});

	it('starts Docker Desktop and waits for its daemon', async () => {
		const ps = new FakePs();
		// info fails, --version and open succeed, info fails once more, then answers.
		const results = [1, 0, 0, 1, 0];
		ps.simulate(async () => results.shift() ?? 0);
		await ensureDocker({ ps, log: new MemoryLogger() }, wait);
		expect(ps.getCalls()).toEqual([
			'docker info',
			'docker --version',
			'open -a Docker',
			'docker info',
			'docker info',
		]);
	});

	it('says docker is missing rather than starting it', async () => {
		const ps = new FakePs();
		ps.simulate(async () => 1);
		await expect(
			ensureDocker({ ps, log: new MemoryLogger() }, wait),
		).rejects.toThrow('docker is not installed');
		expect(ps.getCalls()).not.toContain('open -a Docker');
	});

	it('gives up once the daemon never answers', async () => {
		const ps = new FakePs();
		ps.simulate(async () =>
			ps.getCalls().at(-1)?.startsWith('docker info') ? 1 : 0,
		);
		await expect(
			ensureDocker({ ps, log: new MemoryLogger() }, wait),
		).rejects.toThrow('did not come up in time');
	});
});
