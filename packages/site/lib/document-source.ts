import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { Debouncer, Duration, SystemTimer } from 'webappwiz/time';
import { DEBOUNCE_MS, DEFAULT_FIXTURE, STORAGE_KEY } from './constants';

type DocumentSourceEvents = { changed: undefined };

/* Loads a fixture's raw MusicXML by name. */
export interface Fixtures {
	names(): readonly string[];
	load(name: string): Promise<string> | undefined;
}

/*
 * How to read the current `input`. MusicXML covers both plain text and the .mxl zip around it,
 * which the parser tells apart on its own; a Guitar Pro archive is a different zip that only the
 * uploaded file's extension identifies, so the answer has to be remembered rather than sniffed.
 */
export type DocumentFormat = 'musicxml' | 'guitar-pro';

/* Saved in place of a binary upload, which is not text and so cannot be restored. */
const BINARY_PLACEHOLDER = /^\[(?:mxl|gp)\] /;

/*
 * What is being rendered, and where it came from.
 *
 * `text` is what the editor shows and `input` is what the renderer is fed; they differ while the
 * user is typing (the render lags by a debounce) and for a binary upload, which has no text at
 * all. `format` says how to read `input`, and `fixture` is the picker's selection, cleared as soon
 * as the text is edited or a file is dropped. Keeping the four together is the point: every entry
 * point has to move all of them at once.
 */
export class DocumentSource
	implements Eventful<DocumentSourceEvents>, Resource
{
	private readonly dispatcher = new Dispatcher<DocumentSourceEvents>();
	readonly events = this.dispatcher.events;

	/* The editor's contents. Empty for a binary upload, which is not text. */
	text = '';
	/* What to render: MusicXML text, or an .mxl or .gp Blob. Null before anything has loaded. */
	input: string | Blob | null = null;
	/* Which parser `input` needs. */
	format: DocumentFormat = 'musicxml';
	/* The selected fixture's name, or '' when the document did not come from the picker. */
	fixture = '';
	/* True while a keystroke's re-render is waiting out the debounce. */
	debouncing = false;

	private readonly disposer = new Disposer();
	private readonly debouncer = new Debouncer(
		new SystemTimer(),
		Duration.ms(DEBOUNCE_MS),
	);

	constructor(
		private readonly fixtures: Fixtures,
		private readonly storage: Storage,
	) {
		this.disposer.use(this.debouncer);
		this.disposer.use(this.dispatcher);
	}

	/* Restore the last-edited MusicXML, or open with the default example. */
	async restore(): Promise<void> {
		const saved = this.storage.getItem(STORAGE_KEY);
		// ponytail: a binary upload saves a `[mxl] name` or `[gp] name` placeholder, not the
		// file, so it cannot be restored; fall through to the default example.
		if (saved != null && !BINARY_PLACEHOLDER.test(saved)) {
			this.text = saved;
			this.input = saved;
			this.format = 'musicxml';
			this.dispatcher.dispatch('changed');
			return;
		}
		await this.loadFixture(DEFAULT_FIXTURE);
	}

	/* Load a fixture by name, into both the editor and the score. */
	async loadFixture(name: string): Promise<void> {
		this.stopDebouncing();
		this.fixture = name;
		this.dispatcher.dispatch('changed');
		const xml = await this.fixtures.load(name);
		if (xml === undefined || this.fixture !== name) {
			return;
		}
		this.text = xml;
		this.input = xml;
		this.format = 'musicxml';
		// Storage answers "what to open instead of the default", so the default is the one thing
		// never written: saving it would undo a reset on the very next load.
		if (name === DEFAULT_FIXTURE) {
			this.storage.removeItem(STORAGE_KEY);
		} else {
			this.save(xml);
		}
		this.dispatcher.dispatch('changed');
	}

	/* An edit in the textarea. Renders on every keystroke while renders are fast enough to keep
	 * up, and waits out the typing once they are not. */
	edit(value: string, opts: EditOptions): void {
		this.stopDebouncing();
		this.text = value;
		this.format = 'musicxml';
		this.fixture = '';
		this.save(value);
		if (!value.trim()) {
			this.dispatcher.dispatch('changed');
			return;
		}
		if (opts.immediate) {
			this.input = value;
			this.dispatcher.dispatch('changed');
			return;
		}
		this.debouncing = true;
		this.dispatcher.dispatch('changed');
		this.debouncer.call(() => {
			this.input = this.text;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
		});
	}

	/** Reflect an mdom edit without scheduling a parse or a typing debounce. */
	acceptEdit(xml: string): void {
		this.stopDebouncing();
		this.text = xml;
		this.input = xml;
		this.format = 'musicxml';
		this.save(xml);
		this.dispatcher.dispatch('changed');
	}

	/* A dropped or picked file. .mxl and .gp are both zips, told apart by their extension because
	 * nothing downstream can; MusicXML is plain text, which also goes into the editor so it can be
	 * tweaked. */
	async loadFile(file: File): Promise<void> {
		this.stopDebouncing();
		this.fixture = '';
		const name = file.name.toLowerCase();
		const guitarPro = name.endsWith('.gp');
		if (guitarPro || name.endsWith('.mxl')) {
			this.text = '';
			this.input = file;
			this.format = guitarPro ? 'guitar-pro' : 'musicxml';
			this.save(`[${guitarPro ? 'gp' : 'mxl'}] ${file.name}`);
			this.dispatcher.dispatch('changed');
			return;
		}
		const text = await file.text();
		this.text = text;
		this.input = text;
		this.format = 'musicxml';
		this.save(text);
		this.dispatcher.dispatch('changed');
	}

	/* Forget the saved document and start over from the default example. */
	async clear(): Promise<void> {
		this.storage.removeItem(STORAGE_KEY);
		await this.loadFixture(DEFAULT_FIXTURE);
	}

	names(): readonly string[] {
		return this.fixtures.names();
	}

	dispose(): void {
		this.disposer.dispose();
	}

	// The flag is the loading indicator, and it is not the Debouncer's to know about, so the
	// two are only ever cleared together.
	private stopDebouncing(): void {
		this.debouncer.cancel();
		this.debouncing = false;
	}

	private save(value: string): void {
		this.storage.setItem(STORAGE_KEY, value);
	}
}

export interface EditOptions {
	/* Skip the debounce and render this keystroke now. The caller decides, because only it knows
	 * how long the last render took. */
	immediate?: boolean;
}
