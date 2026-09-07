import { beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_FIXTURE, STORAGE_KEY } from './constants';
import { DocumentSource, type Fixtures } from './document-source';

class FakeFixtures implements Fixtures {
	private readonly scores = new Map([[DEFAULT_FIXTURE, '<score-partwise/>']]);

	names(): readonly string[] {
		return [...this.scores.keys()];
	}

	load(name: string): Promise<string> | undefined {
		const xml = this.scores.get(name);
		return xml === undefined ? undefined : Promise.resolve(xml);
	}
}

class FakeStorage implements Storage {
	private readonly items = new Map<string, string>();

	get length(): number {
		return this.items.size;
	}

	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.items.set(key, value);
	}

	removeItem(key: string): void {
		this.items.delete(key);
	}

	clear(): void {
		this.items.clear();
	}

	key(index: number): string | null {
		return [...this.items.keys()][index] ?? null;
	}
}

describe('DocumentSource', () => {
	let storage: FakeStorage;
	let source: DocumentSource;

	beforeEach(() => {
		storage = new FakeStorage();
		source = new DocumentSource(new FakeFixtures(), storage);
	});

	it('renders an uploaded MusicXML file as text', async () => {
		await source.loadFile(new File(['<score-partwise/>'], 'song.musicxml'));
		expect(source.text).toBe('<score-partwise/>');
		expect(source.input).toBe('<score-partwise/>');
		expect(source.format).toBe('musicxml');
	});

	it('renders an uploaded .mxl file as a MusicXML blob', async () => {
		const file = new File(['PK'], 'song.mxl');
		await source.loadFile(file);
		expect(source.text).toBe('');
		expect(source.input).toBe(file);
		expect(source.format).toBe('musicxml');
	});

	it('renders an uploaded .gp file as a Guitar Pro blob', async () => {
		const file = new File(['PK'], 'song.gp');
		await source.loadFile(file);
		expect(source.text).toBe('');
		expect(source.input).toBe(file);
		expect(source.format).toBe('guitar-pro');
	});

	it('recognizes a Guitar Pro file named in uppercase', async () => {
		await source.loadFile(new File(['PK'], 'SONG.GP'));
		expect(source.format).toBe('guitar-pro');
	});

	it('saves a placeholder for a Guitar Pro upload rather than the file', async () => {
		await source.loadFile(new File(['PK'], 'song.gp'));
		expect(storage.getItem(STORAGE_KEY)).toBe('[gp] song.gp');
	});

	it('opens the default example instead of restoring a Guitar Pro upload', async () => {
		storage.setItem(STORAGE_KEY, '[gp] song.gp');
		await source.restore();
		expect(source.fixture).toBe(DEFAULT_FIXTURE);
		expect(source.format).toBe('musicxml');
	});

	it('reads an edit as MusicXML after a Guitar Pro upload', async () => {
		await source.loadFile(new File(['PK'], 'song.gp'));
		source.edit('<score-partwise/>', { immediate: true });
		expect(source.input).toBe('<score-partwise/>');
		expect(source.format).toBe('musicxml');
	});

	it('reads a fixture as MusicXML after a Guitar Pro upload', async () => {
		await source.loadFile(new File(['PK'], 'song.gp'));
		await source.loadFixture(DEFAULT_FIXTURE);
		expect(source.input).toBe('<score-partwise/>');
		expect(source.format).toBe('musicxml');
	});
});
