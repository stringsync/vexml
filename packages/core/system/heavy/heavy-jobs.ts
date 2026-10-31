import type { Logger } from "core/log";
import { Duration, sleep } from "core/time";
import type { Fs } from "../fs/fs";
import { FileLock } from "../lock/file-lock";
import type { Lock } from "../lock/lock";
import type { Ps } from "../ps/ps";

/**
 * A machine's heavy-job slots: `take` one before a test run or an install,
 * and dispose of it after; `read` says who holds them and who waits. A holder
 * that dies gives its slot back by dying. Every process that opens the same
 * file shares one cap, whichever tool it runs in.
 */
export class HeavyJobs implements HeavyCap {
	// A counting semaphore kept in one file, each entry by pid: every look
	// drops those of processes no longer alive.
	readonly #path: string;
	readonly #opts: HeavyJobsOptions;
	#ids = 0;

	/**
	 * The slots kept in `dir`, as `heavy.json` beside the `heavy.lock` that
	 * guards it.
	 */
	static under(
		dir: string,
		{
			fs,
			ps,
			log,
			cap,
			held,
		}: Pick<HeavyJobsOptions, "log" | "cap" | "held"> & { fs: Fs; ps: Ps },
	): HeavyJobs {
		return new HeavyJobs(`${dir}/heavy.json`, {
			fs,
			ps,
			log,
			lock: new FileLock(`${dir}/heavy.lock`, { fs, ps, log }),
			cap,
			held,
		});
	}

	constructor(
		/** The file the slots are kept in, or a test's own. */
		path: string,
		opts: HeavyJobsOptions,
	) {
		this.#path = path;
		this.#opts = opts;
	}

	async take({
		what,
		task = null,
	}: {
		what: string;
		task?: string | null;
	}): Promise<HeavySlot> {
		const { ps, log, held, now = () => new Date() } = this.#opts;
		if (ps.env(held) !== undefined) {
			return { env: {}, [Symbol.asyncDispose]: async () => {} };
		}
		const entry: HeavyJobEntry = {
			id: `${ps.pid}-${this.#ids++}`,
			what,
			task,
			pid: ps.pid,
			since: now().toISOString(),
		};
		let told = false;
		// Short first waits, so a slot freed quickly is taken quickly.
		let wait = Duration.ms(50);
		for (;;) {
			const holders = await this.#change((file) => {
				const waiting = file.waiting.some((each) => each.id === entry.id)
					? file.waiting
					: [...file.waiting, entry];
				const ahead = waiting.findIndex((each) => each.id === entry.id);
				if (file.running.length + ahead < this.#opts.cap) {
					return {
						file: {
							running: [
								...file.running,
								{ ...entry, since: now().toISOString() },
							],
							waiting: waiting.filter((each) => each.id !== entry.id),
						},
						holders: null,
					};
				}
				return { file: { ...file, waiting }, holders: file.running };
			});
			if (holders === null) {
				break;
			}
			if (!told) {
				told = true;
				log.info(
					[
						`waiting for ${this.#opts.cap === 1 ? "the heavy-job slot" : `one of ${this.#opts.cap} heavy-job slots`} for ${what}, held by:`,
						...holders.map((each) => `  ${describe(each)}`),
					].join("\n"),
				);
			}
			await sleep(wait);
			wait = Duration.ms(Math.min(wait.ms * 2, POLL.ms));
		}
		if (told) {
			log.info(`took a heavy-job slot for ${what}`);
		}
		return {
			env: { [held]: entry.id },
			[Symbol.asyncDispose]: () => this.#give(entry.id),
		};
	}

	async read(): Promise<HeavyJobsReading> {
		const file = this.#living(await this.#read());
		return { cap: this.#opts.cap, ...file };
	}

	async #give(id: string): Promise<void> {
		await this.#change((file) => ({
			file: {
				running: file.running.filter((each) => each.id !== id),
				waiting: file.waiting.filter((each) => each.id !== id),
			},
			holders: null,
		}));
	}

	async #change<T>(
		change: (file: SlotsFile) => { file: SlotsFile; holders: T },
	): Promise<T> {
		const { fs, lock } = this.#opts;
		await fs.mkdir(this.#path.slice(0, this.#path.lastIndexOf("/")));
		await lock.acquire();
		try {
			const { file, holders } = change(this.#living(await this.#read()));
			await fs.write(this.#path, JSON.stringify(file));
			return holders;
		} finally {
			await lock.release();
		}
	}

	#living(file: SlotsFile): SlotsFile {
		const alive = (each: HeavyJobEntry) => this.#opts.ps.alive(each.pid);
		return {
			running: file.running.filter(alive),
			waiting: file.waiting.filter(alive),
		};
	}

	async #read(): Promise<SlotsFile> {
		const raw = await this.#opts.fs.read(this.#path).catch(() => null);
		try {
			return raw === null ? empty() : slotsFile(JSON.parse(raw));
		} catch {
			// A file no reader can take holds no one who could still give back.
			return empty();
		}
	}
}

/** A job that holds, or waits for, one of the machine's slots. */
export interface HeavyJob {
	/** What it runs, as a waiter names it: "preMerge", "bun test". */
	what: string;
	/** The task it runs for, or null outside one. */
	task: string | null;
	/** The process that holds the slot, which frees it by exiting. */
	pid: number;
	/** When it started holding, or waiting. */
	since: string;
}

/** Who holds the machine's slots, and who waits for one, first come first. */
export interface HeavyJobsReading {
	cap: number;
	running: HeavyJob[];
	waiting: HeavyJob[];
}

/** A slot taken, which its holder gives back when the job is done. */
export interface HeavySlot extends AsyncDisposable {
	/**
	 * What to add to the environment of what runs in it, so a heavy job it
	 * starts runs in this slot rather than waiting for another.
	 */
	readonly env: Record<string, string>;
}

/**
 * Caps the heavy jobs (test runs, installs, browser launches) running at
 * once, so several agents testing together queue rather than pinning the CPU
 * and running out of memory.
 */
export interface HeavyCap {
	/** Waits for a free slot, saying what holds them all while it waits. */
	take(job: { what: string; task?: string | null }): Promise<HeavySlot>;
	read(): Promise<HeavyJobsReading>;
}

export interface HeavyJobsOptions {
	fs: Fs;
	/** Tells a holder that died from one still running, and whose job this is. */
	ps: Pick<Ps, "pid" | "alive" | "env">;
	/** Held while the file is read and rewritten, never while a job runs. */
	lock: Lock;
	log: Logger;
	/** How many jobs run at once. */
	cap: number;
	/**
	 * The environment variable a slot sets for what runs in it; a job that
	 * finds it set already runs in its parent's slot, and takes none.
	 */
	held: string;
	/** The current time; a test passes its own. */
	now?: () => Date;
}

interface HeavyJobEntry extends HeavyJob {
	id: string;
}

interface SlotsFile {
	running: HeavyJobEntry[];
	waiting: HeavyJobEntry[];
}

/** How long a waiter sleeps between looks, at most. */
const POLL = Duration.secs(1);

const empty = (): SlotsFile => ({ running: [], waiting: [] });

/** The file as written, or throws when it is anything else. */
function slotsFile(value: unknown): SlotsFile {
	const { running, waiting } = (value ?? {}) as Record<string, unknown>;
	if (!isEntries(running) || !isEntries(waiting)) {
		throw new Error("not a heavy-job slots file");
	}
	return { running, waiting };
}

function isEntries(value: unknown): value is HeavyJobEntry[] {
	return Array.isArray(value) && value.every(isEntry);
}

function isEntry(value: unknown): value is HeavyJobEntry {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const each = value as Record<string, unknown>;
	return (
		typeof each.id === "string" &&
		typeof each.what === "string" &&
		(typeof each.task === "string" || each.task === null) &&
		typeof each.pid === "number" &&
		typeof each.since === "string"
	);
}

function describe(job: HeavyJob): string {
	return `${job.what}${job.task === null ? "" : ` in ${job.task}`} (pid ${job.pid}, since ${job.since})`;
}
