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
import { disposePools } from './pool';
import type { EvalRenderer, Renderer } from './renderer';
import {
	type VexmlContext,
	type VexmlInput,
	VexmlRenderer,
} from './vexml-renderer';

/**
 * The package's one entry: a factory per engine. Every renderer is inert config —
 * render()/eval() borrow what they need (a pooled tab, a Docker run) and give it back
 * before resolving, so there is nothing per-renderer to dispose. The shared machinery
 * behind the factories is the one resource; disposeAsync() releases it (the class
 * object is this package's webappwiz/disposable AsyncResource).
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

	static musescore(input: MusescoreInput): Renderer {
		return new MusescoreRenderer(input);
	}

	/** Close the shared machinery (one browser process serves every render). Call once
	 * when done rendering — a suite's afterAll, a CLI's finally. Rendering after this
	 * lazily starts fresh machinery. */
	static disposeAsync(): Promise<void> {
		return disposePools();
	}
}

renderers satisfies AsyncResource;
