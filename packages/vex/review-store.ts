import * as path from 'node:path';
import type { Fs } from 'core/system';
import { emptyReview, type Review, type ReviewData } from './review-data';

/** The folder, from vexml/, that holds every review: one folder per name. */
export const REVIEWS_DIR = '.vex/reviews';

/**
 * Reads and writes one review's versions: write a version's page data when serving it,
 * and read or write the person's review of it. `latest` names the newest version.
 */
export class ReviewStore {
	private writeChain: Promise<void> = Promise.resolve();
	private writeSeq = 0;

	constructor(
		private readonly fs: Fs,
		readonly id: string,
	) {
		if (!/^[\w.-]+$/.test(id)) {
			throw new Error(
				`review name ${JSON.stringify(id)}: use letters, digits, dots, dashes and underscores`,
			);
		}
	}

	private get dir(): string {
		return path.join(REVIEWS_DIR, this.id);
	}

	/** The newest version written, or 0 when there is none. */
	async latest(): Promise<number> {
		if (!(await this.fs.exists(this.dir))) {
			return 0;
		}
		const versions = (await this.fs.readdir(this.dir))
			.map((name) => /^data-v(\d+)\.json$/.exec(name)?.[1])
			.filter((version) => version !== undefined)
			.map(Number);
		return versions.length === 0 ? 0 : Math.max(...versions);
	}

	async writeData(data: ReviewData): Promise<void> {
		await this.writeAtomic(
			this.file('data', data.version),
			JSON.stringify(data),
		);
	}

	async readData(version: number): Promise<ReviewData> {
		const file = this.file('data', version);
		if (!(await this.fs.exists(file))) {
			throw new Error(`no review ${this.id} v${version}: run \`vex review\``);
		}
		return JSON.parse(await this.fs.read(file)) as ReviewData;
	}

	/** The review saved for a version, or an empty one when the person has not begun. */
	async readReview(data: ReviewData): Promise<Review> {
		const file = this.file('review', data.version);
		return (await this.fs.exists(file))
			? (JSON.parse(await this.fs.read(file)) as Review)
			: emptyReview(data);
	}

	async writeReview(review: Review): Promise<void> {
		await this.writeAtomic(
			this.file('review', review.version),
			JSON.stringify(review),
		);
	}

	// Serializes writes and swaps via temp-file rename so concurrent readers
	// (such as `vex review show --submitted`) never observe truncated JSON.
	private writeAtomic(target: string, content: string): Promise<void> {
		const run = async () => {
			await this.fs.mkdir(this.dir, { recursive: true });
			const temp = `${target}.tmp-${process.pid}-${this.writeSeq++}`;
			try {
				await this.fs.write(temp, content);
				await this.fs.rename(temp, target);
			} catch (error) {
				await this.fs.rm(temp, { force: true }).catch(() => {});
				throw error;
			}
		};
		const next = this.writeChain.then(run, run);
		this.writeChain = next.catch(() => {});
		return next;
	}

	private file(kind: 'data' | 'review', version: number): string {
		return path.join(this.dir, `${kind}-v${version}.json`);
	}
}
