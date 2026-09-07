import { GuitarProParser, MDOMParser, type MDocument } from '@stringsync/mdom';
import { type ConfigInput, EditingSession, render } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { SystemClock } from 'webappwiz/time';
import {
	type DocumentFormat,
	DocumentSource,
	type Fixtures,
} from './document-source';
import { EditingVoices } from './editing-voices';
import { InstrumentController } from './instrument-controller';
import { RenderConfig } from './render-config';
import { type ScoreMode, ScoreSession } from './score-session';

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
	private mode: ScoreMode = 'view';
	private editingSource: {
		input: string | Blob;
		voices: EditingVoices;
	} | null = null;

	private readonly clock = new SystemClock();

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
		const { input, format, config } = opts;
		if (input == null) {
			return;
		}
		const at = ++this.generation;
		// render() appends a fresh managed canvas, so the previous score has to go first or the
		// canvases stack.
		this.disposeSession();
		this.error = null;
		this.dispatcher.dispatch('changed');
		const start = this.clock.now();
		try {
			let voices =
				this.editingSource?.input === input ? this.editingSource.voices : null;
			if (!voices) {
				const document = await this.parse(input, format);
				if (at !== this.generation) {
					return;
				}
				voices = new EditingVoices(new EditingSession(document));
				this.editingSource = { input, voices };
			}
			const score = await render(voices.editor.document, container, config);
			if (at !== this.generation) {
				score.dispose();
				return;
			}
			this.session = new ScoreSession(
				score,
				container,
				() => this.instrument.current(),
				voices,
				this.mode,
			);
			this.disposer.defer(
				this.session.events.on('changed', () =>
					this.dispatcher.dispatch('changed'),
				),
			);
			this.config.reportRenderMs(this.clock.now().subtract(start).ms);
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
		this.generation++;
		this.disposer.dispose();
	}

	private disposeSession(): void {
		this.mode = this.session?.mode ?? this.mode;
		this.session?.dispose();
		this.session = null;
	}

	private parse(
		input: string | Blob,
		format: DocumentFormat,
	): Promise<MDocument> {
		// Text is MusicXML whatever the format says: every entry point that produces text sets
		// the format back to 'musicxml', and only an upload can be a Guitar Pro archive.
		if (typeof input === 'string') {
			return Promise.resolve(new MDOMParser().parseFromString(input));
		}
		if (format === 'guitar-pro') {
			// Bends, harmonics, slides, lyrics and chord diagrams throw by default, and a Guitar
			// Pro file without any of them is the exception. A playground that refuses most real
			// files is worse than one that draws the notation it understands, so drop the rest.
			return new GuitarProParser().parseFromBlob(input, {
				unsupported: 'omit',
			});
		}
		return new MDOMParser().parseFromBlob(input);
	}
}

export interface RenderIntoOptions {
	/* MusicXML text, or an .mxl or .gp Blob. Null renders nothing. */
	input: string | Blob | null;
	/* Which parser `input` needs; it is a Blob for anything but 'musicxml'. */
	format: DocumentFormat;
	config: ConfigInput;
}
