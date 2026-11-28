import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import type { SpawnCaptureResult, SpawnOptions } from 'core/system';
import { FakeFs, FakePs } from 'core/system/testing';
import { PNG } from 'pngjs';
import {
	DEFAULT_MAX_IMAGES,
	VISUAL_CHANGED_SIGNAL,
	visualCheck,
} from './visual-check';

const REPO = '/repo';
const VEXML = '/repo/vexml';
const COMMON = '/repo/.git';
const STATE = `${COMMON}/splates/vexml-visual-check.json`;

describe('visualCheck', () => {
	it('seeds state on first --fire run without firing', async () => {
		const env = makeEnv({ head: 'aaaa11110000' });
		await visualCheck({
			fire: true,
			force: false,
			seed: false,
			maxImages: DEFAULT_MAX_IMAGES,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(
			env.ps.getCalls().some((c) => c.includes('splates signal fire')),
		).toBe(false);
		expect(JSON.parse(await env.fs.read(STATE))).toEqual({
			commit: 'aaaa11110000',
			lastFiredCommit: null,
			lastFiredAt: null,
		});
	});

	it('advances state without firing when only a narrow engraving sheet moved slightly', async () => {
		const before = makePng(300, 120, [
			{ x: 10, y: 10, w: 200, h: 40 },
			{ x: 20, y: 80, w: 5, h: 5 },
		]);
		const after = makePng(300, 120, [
			{ x: 10, y: 10, w: 200, h: 40 },
			{ x: 40, y: 80, w: 5, h: 5 },
		]);
		const imgPath =
			'vexml/packages/integration/__screenshots__/engraving_articulation.png';
		const env = makeEnv({
			head: 'bbbb22220000',
			diffFrom: 'aaaa11110000',
			diffOutput: `M\t${imgPath}\n`,
			blobs: {
				[`aaaa11110000:${imgPath}`]: before,
				[`bbbb22220000:${imgPath}`]: after,
			},
		});
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'aaaa11110000',
				lastFiredCommit: null,
				lastFiredAt: null,
			}),
		);

		await visualCheck({
			fire: true,
			force: false,
			seed: false,
			maxImages: DEFAULT_MAX_IMAGES,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);
		expect(
			env.ps.getCalls().some((c) => c.includes('splates signal fire')),
		).toBe(false);
		expect(JSON.parse(await env.fs.read(STATE)).commit).toBe('bbbb22220000');
	});

	it('fires vexml.visual-changed with task attribution when a feature baseline changes visibly', async () => {
		const before = makePng(200, 100, [{ x: 20, y: 20, w: 20, h: 10 }]);
		const after = makePng(200, 100, [{ x: 100, y: 20, w: 20, h: 10 }]);
		const imgPath =
			'vexml/packages/integration/__screenshots__/direction_lines.png';
		const env = makeEnv({
			head: 'cccc33330000',
			diffFrom: 'bbbb22220000',
			diffOutput: `M\t${imgPath}\n`,
			logOutput: 'cccc33330000\tDraw cresc. dashes after the word\n',
			envVars: {
				SPLATES_TASK: 'cresc-dashes',
				SPLATES_TASKS: '4450',
			},
			showTaskJson: JSON.stringify({
				id: 4450,
				task: 'cresc-dashes',
				subject: 'Draw cresc. dashes after the word on its line',
				commit: 'cccc33330',
				took: [{ id: 4450, subject: 'Draw cresc. dashes' }],
			}),
			blobs: {
				[`bbbb22220000:${imgPath}`]: before,
				[`cccc33330000:${imgPath}`]: after,
			},
		});
		await env.fs.write(
			STATE,
			JSON.stringify({
				commit: 'bbbb22220000',
				lastFiredCommit: null,
				lastFiredAt: null,
			}),
		);

		await visualCheck({
			fire: true,
			force: false,
			seed: false,
			maxImages: DEFAULT_MAX_IMAGES,
			...env,
		});
		expect(env.ps.getExitCode()).toBe(0);

		const fireCall = env.ps
			.getCalls()
			.find((c) => c.includes(`splates signal fire ${VISUAL_CHANGED_SIGNAL}`));
		expect(fireCall).toBeDefined();
		expect(fireCall).toContain('"slug":"cresc-dashes"');
		expect(fireCall).toContain('"numbers":[4450]');
		expect(fireCall).toContain('"name":"direction_lines.png"');
		expect(fireCall).toContain('Draw cresc. dashes after the word');

		const saved = JSON.parse(await env.fs.read(STATE));
		expect(saved.commit).toBe('cccc33330000');
		expect(saved.lastFiredCommit).toBe('cccc33330000');
	});

	it('renders cropped diff panels when --render is passed', async () => {
		const before = makePng(200, 100, [{ x: 20, y: 20, w: 20, h: 10 }]);
		const after = makePng(200, 100, [{ x: 100, y: 20, w: 20, h: 10 }]);
		const imgPath =
			'vexml/packages/integration/__screenshots__/direction_lines.png';
		const written = new Map<string, Buffer>();
		const env = makeEnv({
			head: 'cccc33330000',
			diffFrom: 'bbbb22220000',
			diffOutput: `M\t${imgPath}\n`,
			blobs: {
				[`bbbb22220000:${imgPath}`]: before,
				[`cccc33330000:${imgPath}`]: after,
			},
		});

		await visualCheck({
			fire: false,
			force: false,
			seed: false,
			from: 'bbbb22220000',
			to: 'cccc33330000',
			renderDir: '/tmp/out',
			maxImages: 4,
			writeBinary: (p, data) => {
				written.set(p, data);
			},
			...env,
		});

		expect(env.ps.getExitCode()).toBe(0);
		expect(written.size).toBe(1);
		const outBuf = written.get('/tmp/out/01-direction_lines.png');
		expect(outBuf).toBeDefined();
		const decoded = PNG.sync.read(outBuf as Buffer);
		expect(decoded.width).toBeGreaterThanOrEqual(460);
	});
});

class StubPs extends FakePs {
	private readonly stubs: Array<{
		prefix: string;
		result: SpawnCaptureResult;
	}> = [];
	private readonly envMap = new Map<string, string>();

	when(prefix: string, result: SpawnCaptureResult): void {
		this.stubs.push({ prefix, result });
	}

	setEnvVars(vars: Record<string, string>): void {
		for (const [k, v] of Object.entries(vars)) {
			this.envMap.set(k, v);
		}
	}

	override env(name: string): string | undefined {
		return this.envMap.get(name) ?? super.env(name);
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
	logOutput?: string;
	envVars?: Record<string, string>;
	showTaskJson?: string;
	blobs?: Record<string, Buffer>;
}

function makeEnv(opts: EnvOptions) {
	const fs = new FakeFs();
	const ps = new StubPs();
	ps.setCwd(VEXML);
	if (opts.envVars) {
		ps.setEnvVars(opts.envVars);
	}
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
			`git -C ${REPO} diff --name-status --diff-filter=M ${opts.diffFrom}..${opts.head}`,
			{
				exitCode: 0,
				stdout: opts.diffOutput ?? '',
				stderr: '',
			},
		);
		ps.when(
			`git -C ${REPO} log --format=%H\t%s ${opts.diffFrom}..${opts.head}`,
			{
				exitCode: 0,
				stdout: opts.logOutput ?? '',
				stderr: '',
			},
		);
	}
	if (opts.showTaskJson !== undefined) {
		ps.when('splates show ', {
			exitCode: 0,
			stdout: opts.showTaskJson,
			stderr: '',
		});
	}
	ps.when(`splates signal fire ${VISUAL_CHANGED_SIGNAL}`, {
		exitCode: 0,
		stdout: '',
		stderr: '',
	});

	const blobs = opts.blobs ?? {};
	const readGitBlob = async (
		_repoRoot: string,
		ref: string,
		repoPath: string,
	): Promise<Buffer | null> => blobs[`${ref}:${repoPath}`] ?? null;

	return { fs, ps, log, readGitBlob };
}

function makePng(
	width: number,
	height: number,
	inkRects: Array<{ x: number; y: number; w: number; h: number }>,
): Buffer {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const rect of inkRects) {
		for (let y = rect.y; y < Math.min(height, rect.y + rect.h); y++) {
			for (let x = rect.x; x < Math.min(width, rect.x + rect.w); x++) {
				const o = (y * width + x) * 4;
				png.data[o] = 0;
				png.data[o + 1] = 0;
				png.data[o + 2] = 0;
				png.data[o + 3] = 255;
			}
		}
	}
	return PNG.sync.write(png);
}
