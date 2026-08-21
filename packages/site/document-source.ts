import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { Duration, SystemTimer } from 'webappwiz/time';
import { DEBOUNCE_MS, DEFAULT_FIXTURE, STORAGE_KEY } from './constants';

type DocumentSourceEvents = { changed: undefined };

/* Loads a fixture's raw MusicXML by name. */
export interface Fixtures {
	names(): readonly string[];
	load(name: string): Promise<string> | undefined;
}

/*
 * What is being rendered, and where it came from.
 *
 * `text` is what the editor shows and `input` is what the renderer is fed; they differ while the
 * user is typing (the render lags by a debounce) and for an .mxl upload, which has no text at all.
 * `fixture` is the picker's selection, cleared as soon as the text is edited or a file is dropped.
 * Keeping the three together is the point: every entry point has to move all of them at once.
 */
export class DocumentSource
	implements Eventful<DocumentSourceEvents>, Resource
{
	private readonly dispatcher = new Dispatcher<DocumentSourceEvents>();
	readonly events = this.dispatcher.events;

	/* The editor's contents. Empty for an .mxl upload, which is not text. */
	text = '';
	/* What to render: MusicXML text, or an .mxl Blob. Null before anything has loaded. */
	input: string | Blob | null = null;
	/* The selected fixture's name, or '' when the document did not come from the picker. */
	fixture = '';
	/* True while a keystroke's re-render is waiting out the debounce. */
	debouncing = false;

	private readonly disposer = new Disposer();
	private readonly timer = new SystemTimer();
	private pending: Resource | undefined;

	constructor(
		private readonly fixtures: Fixtures,
		private readonly storage: Storage,
	) {
		this.disposer.defer(() => this.cancelDebounce());
		this.disposer.use(this.dispatcher);
	}

	/* Restore the last-edited MusicXML, or open with the default example. */
	async restore(): Promise<void> {
		const saved = this.storage.getItem(STORAGE_KEY);
		// ponytail: .mxl saves a `[mxl] name` placeholder, not the file, so it cannot be
		// restored; fall through to the default example.
		if (saved != null && !saved.startsWith('[mxl] ')) {
			this.text = saved;
			this.input = saved;
			this.dispatcher.dispatch('changed');
			return;
		}
		await this.loadFixture(DEFAULT_FIXTURE);
	}

	/* Load a fixture by name, into both the editor and the score. */
	async loadFixture(name: string): Promise<void> {
		this.cancelDebounce();
		this.fixture = name;
		this.dispatcher.dispatch('changed');
		const xml = await this.fixtures.load(name);
		if (xml === undefined || this.fixture !== name) {
			return;
		}
		this.text = xml;
		this.input = xml;
		this.save(xml);
		this.dispatcher.dispatch('changed');
	}

	/* An edit in the textarea. Renders on every keystroke while renders are fast enough to keep
	 * up, and waits out the typing once they are not. */
	edit(value: string, opts: EditOptions = {}): void {
		this.cancelDebounce();
		this.text = value;
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
		this.pending = this.timer.setTimeout(() => {
			this.input = this.text;
			this.debouncing = false;
			this.dispatcher.dispatch('changed');
		}, Duration.ms(DEBOUNCE_MS));
	}

	/* A dropped or picked file. .mxl is a zip, which render() detects from the Blob; MusicXML is
	 * plain text, which also goes into the editor so it can be tweaked. */
	async loadFile(file: File): Promise<void> {
		this.cancelDebounce();
		this.fixture = '';
		if (file.name.toLowerCase().endsWith('.mxl')) {
			this.text = '';
			this.input = file;
			this.save(`[mxl] ${file.name}`);
			this.dispatcher.dispatch('changed');
			return;
		}
		const text = await file.text();
		this.text = text;
		this.input = text;
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

	private cancelDebounce(): void {
		this.pending?.dispose();
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
