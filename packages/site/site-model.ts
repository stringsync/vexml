import { type ConfigInput, render } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { DocumentSource, type Fixtures } from './document-source';
import { InstrumentController } from './instrument-controller';
import { RenderConfig } from './render-config';
import { ScoreSession } from './score-session';

type SiteModelEvents = { changed: undefined };

/*
 * The playground's model: what to render, how to render it, what came out, and the synth that
 * sounds it. The component reads projections of this and calls its methods; nothing about the
 * interaction is modeled in React.
 *
 * The parts are separate objects because they are separately readable (the config panel does not
 * care about playback), but the render itself is the seam that binds them, so it lives here: a
 * render is driven by the document and the applied config, and produces the session everything
 * downstream reads.
 */
export class SiteModel implements Eventful<SiteModelEvents>, Resource {
	private readonly dispatcher = new Dispatcher<SiteModelEvents>();
	readonly events = this.dispatcher.events;

	readonly config = new RenderConfig();
	readonly document: DocumentSource;
	readonly instrument: InstrumentController;

	/* The live score and everything happening to it, or null before the first render lands. */
	session: ScoreSession | null = null;
	/* The last render's failure message, or null. */
	error: string | null = null;
	/* False until the first render settles, one way or the other; drives the loading overlay. */
	initialized = false;

	private readonly disposer = new Disposer();
	// Bumped per render request. A render that resolves after a newer one started is dropped, so a
	// late score never leaks a canvas into a container a newer render already owns.
	private generation = 0;

	constructor(fixtures: Fixtures, storage: Storage) {
		this.document = new DocumentSource(fixtures, storage);
		this.instrument = new InstrumentController(storage);
		this.disposer.use(this.config);
		this.disposer.use(this.document);
		this.disposer.use(this.instrument);
		this.disposer.use(this.dispatcher);
		this.disposer.defer(() => this.disposeSession());
		// Every part's change is the model's change, so a component reads one object.
		for (const part of [this.config, this.document, this.instrument]) {
			this.disposer.defer(
				part.events.on('changed', () => this.dispatcher.dispatch('changed')),
			);
		}
	}

	/*
	 * Draw a document into `container`, replacing whatever was there. Safe to call on every change:
	 * a render superseded before it resolves is discarded rather than mounted.
	 *
	 * What to draw is passed in rather than read off this model, so the caller's effect names every
	 * input it re-renders on.
	 */
	async renderInto(
		container: HTMLDivElement,
		opts: RenderIntoOptions,
	): Promise<void> {
		const { input, config } = opts;
		if (input == null) {
			return;
		}
		const at = ++this.generation;
		// render() appends a fresh managed canvas, so the previous score has to go first or the
		// canvases stack.
		this.disposeSession();
		this.error = null;
		this.dispatcher.dispatch('changed');
		const start = performance.now();
		try {
			const score = await render(input, container, config);
			if (at !== this.generation) {
				score.dispose();
				return;
			}
			this.session = new ScoreSession(score, container, () =>
				this.instrument.current(),
			);
			this.disposer.defer(
				this.session.events.on('changed', () =>
					this.dispatcher.dispatch('changed'),
				),
			);
			this.config.reportRenderMs(performance.now() - start);
		} catch (e: unknown) {
			if (at !== this.generation) {
				return;
			}
			this.error = e instanceof Error ? e.message : String(e);
			this.config.reportRenderMs(null);
		} finally {
			if (at === this.generation) {
				this.initialized = true;
				this.dispatcher.dispatch('changed');
			}
		}
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private disposeSession(): void {
		this.session?.dispose();
		this.session = null;
	}
}

export interface RenderIntoOptions {
	/* MusicXML text, or an .mxl Blob. Null renders nothing. */
	input: string | Blob | null;
	config: ConfigInput;
}
