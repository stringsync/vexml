import { describe, expect, it } from 'bun:test';
import { FakeGit, FakeWorkspace } from 'core/legacy-ship/testing';
import { MemoryLogger } from 'core/log';
import { FakeFs, FakePs } from 'core/system/testing';
import { ship } from './legacy-ship';

describe('ship command', () => {
	it('plans the vexml release with shared bump inputs without stamping or publishing', async () => {
		const ps = new FakePs();
		ps.setEnv({
			SPLATES_SHIP_BUMP: 'major',
			SPLATES_SHIP_INPUTS: '{"bump":"minor"}',
		});
		const workspace = new FakeWorkspace();
		const fs = new FakeFs();
		await fs.mkdir('/repo');
		let printed = '';
		await ship({
			ps,
			fs,
			workspace,
			git: new FakeGit(),
			log: new MemoryLogger(),
			argv: [
				'plan',
				'--json',
				'--input',
				'bump=major',
				'--input',
				'bump=patch',
			],
			output: {
				write(text) {
					printed += text;
				},
			},
		});
		expect(JSON.parse(printed)).toMatchObject({
			schema: 1,
			identity: { kind: 'version', from: '1.2.3', to: '1.2.4' },
			inputs: [
				{
					name: 'bump',
					type: 'choice',
					options: ['patch', 'minor', 'major'],
					default: 'patch',
				},
				{ name: 'adopt', type: 'string', default: '' },
			],
			steps: expect.arrayContaining([
				expect.objectContaining({
					name: 'Adopt upstream versions',
					stage: 'preflight',
				}),
				expect.objectContaining({ name: 'Typecheck', stage: 'preflight' }),
				expect.objectContaining({
					artifact: '@stringsync/vexml',
					stage: 'publish',
				}),
				expect.objectContaining({ artifact: 'GitHub release', stage: 'notes' }),
			]),
		});
		expect(workspace.stamped).toEqual([]);
	});

	it('reports deployed versions without stamping the workspace', async () => {
		const ps = new FakePs();
		ps.setCaptureOutput('1.2.2', '');
		const workspace = new FakeWorkspace();
		let printed = '';
		await ship({
			ps,
			workspace,
			log: new MemoryLogger(),
			argv: ['status', '--json'],
			output: {
				write(text) {
					printed += text;
				},
			},
		});
		expect(JSON.parse(printed)).toEqual({
			identity: { kind: 'version', from: '1.2.3', to: '1.2.3' },
			artifacts: [
				{ name: '@stringsync/vexml', deployed: '1.2.2' },
				{ name: 'GitHub release', deployed: '1.2.2' },
			],
		});
		expect(workspace.stamped).toEqual([]);
	});

	it('rejects invalid inputs before running release steps', async () => {
		await expect(
			ship({
				ps: new FakePs(),
				log: new MemoryLogger(),
				argv: ['--input', 'bump=other'],
			}),
		).rejects.toThrow('invalid ship input bump');
	});
});
