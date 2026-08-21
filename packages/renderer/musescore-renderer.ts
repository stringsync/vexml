import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import type { Image, Renderer } from './renderer';

export interface MusescoreInput {
	musicXML: string;
}

/**
 * The one engine with no browser behind it: MuseScore in Docker (see musescore/).
 * A reference renderer with its own bugs and its own house style — a second opinion on
 * an ambiguous measure, not ground truth. No eval: MuseScore renders at arm's length
 * and keeps no live handle.
 */
export class MusescoreRenderer implements Renderer {
	constructor(private readonly input: MusescoreInput) {}

	async render(): Promise<Image> {
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
