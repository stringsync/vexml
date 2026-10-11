import * as path from 'node:path';
import {
	dimensions,
	type Image,
	type Renderer,
	renderers,
} from '@vexml/renderer';
import type { Fs } from 'webappwiz/system';
import type { Cell, Engine } from './perf-events';

export const DATA_DIR = path.resolve(
	import.meta.dir,
	'../integration/__data__',
);

/** What one render produced: its cell, and its PNG when it worked. */
export interface Measurement {
	cell: Cell;
	image?: Image;
}

/** Renders one fixture through one engine, timing render() alone. */
export interface Bench {
	measure(fixture: string, engine: Engine): Promise<Measurement>;
}

/**
 * Measures the fixtures in packages/integration/__data__ by name. Dispose it when done
 * measuring; until then, later measures (a retry from the page) render as warm as the
 * first ones did.
 */
export class RendererBench implements Bench {
	// Every bench shares the renderer package's one browser, which disposeAsync closes.
	readonly #fs: Fs;
	// Each fixture goes through every engine in turn, so one read serves all three.
	#last: { fixture: string; musicXML: string } | undefined;

	constructor(fs: Fs) {
		this.#fs = fs;
	}

	async measure(fixture: string, engine: Engine): Promise<Measurement> {
		if (this.#last?.fixture !== fixture) {
			const musicXML = await this.#fs.read(
				path.join(DATA_DIR, `${fixture}.musicxml`),
			);
			this.#last = { fixture, musicXML };
		}
		return measure(build(engine, this.#last.musicXML));
	}

	disposeAsync(): Promise<void> {
		return renderers.disposeAsync();
	}
}

function build(engine: Engine, musicXML: string): Renderer {
	switch (engine) {
		case 'vexml':
			// OSMD and alphaTab leave a short last system ragged, lone or not, and have no
			// setting for vexml's stretch-once-mostly-full rule, so vexml leaves it ragged too.
			// The pages then compare one layout, not one score stretched and one not.
			return renderers.vexml({
				musicXML,
				config: { stretchSingleSystem: false, minLastSystemFill: 1 },
			});
		case 'osmd':
			return renderers.osmd({ musicXML });
		case 'alphatab':
			return renderers.alphatab({ musicXML });
	}
}

/** Times render() alone: no file read, no PNG write, no process startup. */
async function measure(renderer: Renderer): Promise<Measurement> {
	const started = Date.now();
	try {
		const image = await renderer.render();
		const ms = Date.now() - started;
		return { cell: { ms, size: dimensions(image) }, image };
	} catch (e) {
		// A fixture no engine but vexml can parse shouldn't cost the other 500 renders.
		return { cell: { error: e instanceof Error ? e.message : String(e) } };
	}
}
