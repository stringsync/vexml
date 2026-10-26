import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { type InkMask, renderers } from '@vexml/renderer';
import { Rect } from 'webappwiz/geometry';
import { type Fs, NodeFs, NodePs, type Ps } from 'webappwiz/system';
import { HistoryInkSource } from '../renderer/history-ink-source';
import { PlaywrightBrowser } from '../renderer/playwright-browser';
import { InkCollisions } from './ink-collisions';
import { InkMap } from './ink-map';
import type { DefectLabel } from './lint-corpus';
import { locate } from './measure-locator';

/** Rebuilds history with identical fixed-revision inputs and records live clean masks.
 * Run explicitly: it installs archived production dependencies and renders the corpus. */
export class InkCorpusCapture {
	constructor(
		private readonly fs: Fs,
		private readonly ps: Ps,
		private readonly root: string,
	) {}

	async capture(): Promise<void> {
		const corpus = join(this.root, 'packages/integration/__lint__');
		const labels = JSON.parse(
			await this.fs.read(join(corpus, 'defects.json')),
		) as DefectLabel[];
		const browser = new PlaywrightBrowser();
		try {
			for (const label of labels) {
				const files = this.git(
					'ls-tree',
					'-r',
					'--name-only',
					label.commit,
				).split('\n');
				const fixture = files.find((file) =>
					file.endsWith(
						`/__data__/${label.screenshot.replace(/\.png$/, '.musicxml')}`,
					),
				);
				if (!fixture) {
					throw new Error(`no fixed fixture for ${label.id}`);
				}
				const xml = this.git('show', `${label.commit}:${fixture}`);
				const results = [];
				for (const [side, revision] of [
					['before', `${label.commit}^`],
					['after', label.commit],
				] as const) {
					const archive = await this.prepare(revision);
					const script = await this.script(archive);
					const tab = await browser.open({
						html: '<body style="margin:0"><div id="screenshot" style="padding:16px;display:inline-block"></div></body>',
						scripts: [
							"globalThis.__require = name => { throw new Error('unexpected historical require: '+name); };",
							script,
						],
						width: 1064,
						height: 600,
					});
					try {
						const masks = await tab.call<InkMask[]>('historyRender', xml);
						const png = await tab.screenshot('#screenshot');
						const file = join(corpus, 'defects', `${label.id}.${side}.png`);
						await this.fs.writeBytes(file, png);
						await this.fs.writeBytes(
							`${file}.masks.json.gz`,
							gzipSync(
								JSON.stringify({
									pngHash: createHash('sha256').update(png).digest('hex'),
									masks,
								}),
							),
						);
						results.push({ png, masks });
					} finally {
						await tab.disposeAsync();
					}
				}
				const before = results[0],
					after = results[1];
				if (!before || !after) {
					throw new Error('history pair missing');
				}
				const changed = this.changedBox(
					InkMap.fromPng(before.png),
					InkMap.fromPng(after.png),
				);
				if (changed) {
					label.box = changed;
				}
				const findings = new InkCollisions(before.masks).findings();
				label.inputCommit = label.commit;
				label.missedReason = changed
					? undefined
					: 'same fixture produces identical ink before and after on replay';
				label.missed =
					!changed ||
					!findings.some((f) =>
						f.box.intersects(
							new Rect(label.box.x, label.box.y, label.box.w, label.box.h),
						),
					);
				console.log(
					`${label.id}: ${findings.length} before, ${new InkCollisions(after.masks).findings().length} after; ${label.missed ? 'missed' : 'found'}`,
				);
				await this.fs.write(
					join(corpus, 'defects.json'),
					`${JSON.stringify(labels, null, '\t')}\n`,
				);
			}
		} finally {
			await browser.disposeAsync();
		}
		const captures = join(corpus, 'clean-masks');
		await this.fs.mkdir(captures);
		try {
			for (const fixture of (
				await this.fs.readdir(join(this.root, 'packages/integration/__data__'))
			)
				.filter((file) => file.endsWith('.musicxml'))
				.sort()) {
				const xml = await this.fs.read(
					join(this.root, 'packages/integration/__data__', fixture),
				);
				const { png, masks } = await locate('vexml', xml);
				await this.fs.writeBytes(
					join(captures, `${fixture}.json.gz`),
					gzipSync(JSON.stringify({ png: png.toBase64(), masks })),
				);
				console.log(
					`${fixture}: ${masks?.length ?? 0} clean masks, ${new InkCollisions(masks ?? []).findings().length} collisions`,
				);
			}
		} finally {
			await renderers.disposeAsync();
		}
	}

	private git(...args: string[]): string {
		return execFileSync('git', args, {
			cwd: this.root,
			maxBuffer: 32 * 1024 * 1024,
		}).toString();
	}

	private async prepare(revision: string): Promise<string> {
		const sha = this.git('rev-parse', revision).trim();
		const dir = join(
			this.root,
			'packages/integration/__artifacts__/lint-ink-masks/.history',
			sha,
		);
		if (await this.fs.exists(join(dir, '.ink-installed'))) {
			return dir;
		}
		await this.fs.mkdir(dir);
		const top = this.git('ls-tree', '--name-only', sha).split('\n');
		const paths = top.includes('packages')
			? ['packages/vexml']
			: ['src', 'assets', 'css', 'package.json'].filter((path) =>
					top.includes(path),
				);
		const archive = execFileSync('git', ['archive', sha, '--', ...paths], {
			cwd: this.root,
			maxBuffer: 128 * 1024 * 1024,
		});
		execFileSync('tar', ['-x', '-C', dir], {
			input: archive,
			maxBuffer: 128 * 1024 * 1024,
		});
		const pkgPath = (await this.fs.exists(
			join(dir, 'packages/vexml/package.json'),
		))
			? join(dir, 'packages/vexml/package.json')
			: join(dir, 'package.json');
		const pkg = JSON.parse(await this.fs.read(pkgPath));
		// Only the library is bundled. Avoid installing the archived playground and tools.
		await this.fs.write(
			join(dir, 'package.json'),
			JSON.stringify({
				private: true,
				type: 'module',
				dependencies: pkg.dependencies,
			}),
		);
		for (const lock of ['bun.lock', 'bun.lockb']) {
			if (await this.fs.exists(join(dir, lock))) {
				await this.fs.rm(join(dir, lock));
			}
		}
		const { exitCode } = await this.ps.spawn(
			['bun', 'install', '--production', '--ignore-scripts'],
			{ cwd: dir },
		);
		if (exitCode !== 0) {
			throw new Error(`historical install failed: ${revision}`);
		}
		await this.fs.write(join(dir, '.ink-installed'), 'ready');
		return dir;
	}

	private async script(archive: string): Promise<string> {
		const entry = join(archive, 'ink-entry.ts');
		const lib = (await this.fs.exists(
			join(archive, 'packages/vexml/render.ts'),
		))
			? './packages/vexml/render'
			: './src/render';
		const helper = resolve(
			this.root,
			'packages/renderer/legacy-ink-recording.ts',
		);
		const renderSource = await this.fs.read(
			join(archive, `${lib.replace(/^\.\//, '')}.ts`),
		);
		const target = renderSource.includes('canvas: HTMLCanvasElement')
			? "document.getElementById('screenshot').appendChild(document.createElement('canvas'))"
			: "document.getElementById('screenshot')";
		await this.fs.write(
			entry,
			`import {render} from ${JSON.stringify(lib)}; import {LegacyInkRecording} from ${JSON.stringify(helper)}; Object.assign(globalThis,{historyRender:async xml=>{LegacyInkRecording.masks=[];await render(xml,${target});return LegacyInkRecording.masks;}});`,
		);
		const result = await Bun.build({
			entrypoints: [entry],
			target: 'browser',
			format: 'iife',
			plugins: [new HistoryInkSource(archive, this.fs).plugin()],
		});
		if (!result.success || !result.outputs[0]) {
			throw new AggregateError(
				result.logs,
				`historical bundle failed: ${archive}`,
			);
		}
		return result.outputs[0].text();
	}

	private changedBox(
		a: InkMap,
		b: InkMap,
	): { x: number; y: number; w: number; h: number } | null {
		let left = Infinity,
			top = Infinity,
			right = -1,
			bottom = -1;
		for (let y = 0; y < Math.max(a.height, b.height); y++) {
			for (let x = 0; x < Math.max(a.width, b.width); x++) {
				const first = x < a.width && y < a.height && a.isInk(x, y),
					second = x < b.width && y < b.height && b.isInk(x, y);
				if (first !== second) {
					left = Math.min(left, x);
					top = Math.min(top, y);
					right = Math.max(right, x + 1);
					bottom = Math.max(bottom, y + 1);
				}
			}
		}
		if (right < 0) {
			return null;
		}
		return { x: left, y: top, w: right - left, h: bottom - top };
	}
}

if (import.meta.main) {
	await new InkCorpusCapture(
		new NodeFs(),
		new NodePs(),
		resolve(import.meta.dir, '../..'),
	).capture();
}
