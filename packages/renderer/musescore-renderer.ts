import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { bundle } from './bundle';
import type { InkMask } from './ink-mask';
import type { Image, Renderer } from './renderer';
import { tabPools } from './tab-pools';

export interface MusescoreInput {
	musicXML: string;
}

/**
 * Renders MusicXML to a PNG with MuseScore. Use it as a second opinion on an ambiguous
 * measure, not as ground truth: MuseScore has its own bugs and its own house style.
 * Unlike the browser renderers, it offers no eval.
 */
export class MusescoreRenderer implements Renderer {
	constructor(private readonly input: MusescoreInput) {}

	async capture(): Promise<{ image: Image; masks: InkMask[] }> {
		const dir = await mkdtemp(path.join(tmpdir(), 'vexml-musescore-ink-'));
		try {
			const input = path.join(dir, 'score.musicxml'),
				output = path.join(dir, 'score.svg');
			await Bun.write(input, this.input.musicXML);
			const proc = Bun.spawn(
				[path.resolve(import.meta.dir, 'musescore/render.sh'), input, output],
				{ stdout: 'pipe', stderr: 'inherit' },
			);
			if ((await proc.exited) !== 0) {
				throw new Error('MuseScore SVG export failed');
			}
			if (!(await Bun.file(output).exists())) {
				throw new Error(
					'MuseScore paginated the score; slice down to fewer measures',
				);
			}
			const svg = await Bun.file(output).text();
			const pool = tabPools.pool('musescore-svg', {
				html: '<body style="margin:0;background:white"><div id="screenshot" style="display:inline-block;overflow:hidden;vertical-align:top"></div></body>',
				scripts: async () => [
					await bundle(path.resolve(import.meta.dir, 'musescore-page.ts')),
				],
				width: 1100,
				height: 600,
			});
			return pool.withTab(async (tab) => {
				await tab.call('mount', { svg });
				const { masks } = await tab.call<{ masks: InkMask[] }>('evaluate', {
					fnSrc: 'ctx => ctx',
				});
				return { image: await tab.screenshot('#screenshot'), masks };
			});
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}

	async render(): Promise<Image> {
		// The one engine with no browser behind it: MuseScore runs in Docker (see
		// musescore/) at arm's length and keeps no live handle, which is why there's no eval.
		const dir = await mkdtemp(path.join(tmpdir(), 'vexml-musescore-'));
		try {
			const input = path.join(dir, 'score.musicxml');
			const output = path.join(dir, 'score.png');
			await Bun.write(input, this.input.musicXML);
			const proc = Bun.spawn(
				[path.resolve(import.meta.dir, 'musescore/render.sh'), input, output],
				// stdout piped: render.sh narrates ("wrote ..."), which is its CLI past
				// talking. stderr through: the first run builds a ~740MB Docker image and
				// that progress is worth seeing.
				{ stdout: 'pipe', stderr: 'inherit' },
			);
			if ((await proc.exited) !== 0) {
				throw new Error('musescore render failed');
			}
			const png = Bun.file(output);
			if (!(await png.exists())) {
				// render.sh leaves score-1.png, score-2.png, … when MuseScore paginates.
				// ponytail: a single page is the designed use (a measure or two for a
				// second opinion); stitch pages together if whole-score renders matter.
				throw new Error(
					'MuseScore paginated the score; `vex slice` down to fewer measures',
				);
			}
			return Buffer.from(await png.bytes());
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}
}
