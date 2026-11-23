import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { emptyReview, type Review, type ReviewData } from './review-data';
import { REVIEWS_DIR, ReviewStore } from './review-store';

describe('ReviewStore', () => {
	it('writes atomically via temp file and rename, leaving no temp files behind', async () => {
		const fs = new TrackingFs();
		const store = new ReviewStore(fs, 'atomic-test');
		const review = makeReview('atomic-test', 1, { 'a.png': 'approved' }, true);

		await store.writeReview(review);

		expect(fs.renamed).toHaveLength(1);
		expect(fs.renamed[0]?.from).toContain('review-v1.json.tmp-');
		expect(fs.renamed[0]?.to).toBe(`${REVIEWS_DIR}/atomic-test/review-v1.json`);
		expect(await fs.readdir(`${REVIEWS_DIR}/atomic-test`)).toEqual([
			'review-v1.json',
		]);
		expect(await store.readReview(makeData('atomic-test', 1))).toEqual(review);
	});

	it('serializes concurrent writes so a slower earlier write cannot clobber a newer one', async () => {
		const gate = deferred();
		const fs = new TrackingFs({ blockFirstWrite: gate.promise });
		const store = new ReviewStore(fs, 'serial-test');
		const first = makeReview('serial-test', 1, { 'a.png': 'approved' }, false);
		const second = makeReview(
			'serial-test',
			1,
			{ 'a.png': 'approved', 'b.png': 'approved' },
			true,
		);

		const firstWrite = store.writeReview(first);
		const secondWrite = store.writeReview(second);
		gate.resolve();
		await Promise.all([firstWrite, secondWrite]);

		expect(await store.readReview(makeData('serial-test', 1))).toEqual(second);
	});

	it('cleans up the temp file and stays usable after a write error', async () => {
		const fs = new TrackingFs({ failRenameOnce: true });
		const store = new ReviewStore(fs, 'recover-test');
		const review = makeReview('recover-test', 1, { 'a.png': 'approved' }, true);

		await expect(store.writeReview(review)).rejects.toThrow('rename failed');
		expect(await fs.readdir(`${REVIEWS_DIR}/recover-test`)).toEqual([]);

		await store.writeReview(review);
		expect(await store.readReview(makeData('recover-test', 1))).toEqual(review);
	});
});

class TrackingFs extends FakeFs {
	readonly renamed: { from: string; to: string }[] = [];
	private failRenameOnce: boolean;
	private readonly blockFirstWrite: Promise<void> | null;
	private writeCalls = 0;

	constructor(
		opts: { failRenameOnce?: boolean; blockFirstWrite?: Promise<void> } = {},
	) {
		super();
		this.failRenameOnce = opts.failRenameOnce ?? false;
		this.blockFirstWrite = opts.blockFirstWrite ?? null;
	}

	override async write(file: string, content: string): Promise<void> {
		this.writeCalls++;
		if (this.writeCalls === 1 && this.blockFirstWrite) {
			await this.blockFirstWrite;
		}
		await super.write(file, content);
	}

	override async rename(from: string, to: string): Promise<void> {
		if (this.failRenameOnce) {
			this.failRenameOnce = false;
			throw new Error('rename failed');
		}
		this.renamed.push({ from, to });
		await super.rename(from, to);
	}
}

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function makeData(id: string, version: number): ReviewData {
	return {
		id,
		version,
		title: id,
		tradeoffs: null,
		unchanged: 0,
		entries: [],
		mode: 'served',
	};
}

function makeReview(
	id: string,
	version: number,
	verdicts: Review['verdicts'],
	submitted: boolean,
): Review {
	return {
		...emptyReview({ id, version }),
		verdicts,
		submitted,
	};
}
