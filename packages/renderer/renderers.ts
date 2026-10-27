import type { AsyncResource } from 'webappwiz/disposable';
import {
	type AlphatabContext,
	type AlphatabInput,
	AlphatabRenderer,
} from './alphatab-renderer';
import { type MusescoreInput, MusescoreRenderer } from './musescore-renderer';
import {
	type OsmdContext,
	type OsmdInput,
	OsmdRenderer,
} from './osmd-renderer';
import type { EvalRenderer } from './renderer';
import { tabPools } from './tab-pools';
import {
	type VexmlContext,
	type VexmlInput,
	VexmlRenderer,
} from './vexml-renderer';

// Every renderer is inert config: render()/eval() borrow what they need (a pooled tab, a
// Docker run) and give it back before resolving, so there is nothing per-renderer to
// dispose. The class object is this package's webappwiz/disposable AsyncResource.

/**
 * The package's one entry: a factory per engine. Call the factory for the engine you want
 * and render with the result. Call disposeAsync() once when you are done to release the
 * machinery the renderers share.
 */
export class renderers {
	private constructor() {}

	static vexml(input: VexmlInput): EvalRenderer<VexmlContext> {
		return new VexmlRenderer(input);
	}

	static osmd(input: OsmdInput): EvalRenderer<OsmdContext> {
		return new OsmdRenderer(input);
	}

	static alphatab(input: AlphatabInput): EvalRenderer<AlphatabContext> {
		return new AlphatabRenderer(input);
	}

	static musescore(input: MusescoreInput): MusescoreRenderer {
		return new MusescoreRenderer(input);
	}

	/** Close the shared machinery (one browser process serves every render). Call once
	 * when done rendering: a suite's afterAll, a CLI's finally. Rendering after this
	 * lazily starts fresh machinery. */
	static disposeAsync(): Promise<void> {
		return tabPools.disposeAsync();
	}
}

renderers satisfies AsyncResource;
