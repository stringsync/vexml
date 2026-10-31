import { rmSync } from "node:fs";
import { Disposer } from "core/disposable";
import { ConsoleLogger, color, type Logger } from "core/log";
import { Duration, sleep } from "core/time";
import type { Fs } from "../fs/fs";
import { NodeFs } from "../fs/node-fs";
import { NodePs } from "../ps/node-ps";
import type { Ps } from "../ps/ps";
import type { Lock } from "./lock";

interface Holder {
	pid: number;
	hostname: string;
	at: string;
}

export interface FileLockOptions {
	/** How long a holder on another host may hold the lock before it can be stolen. */
	stalenessMs?: number;
	/**
	 * Judge a holder by its pid alone, whatever hostname it was written under,
	 * for hosts whose hostname changes (macOS flips it with the network).
	 */
	pidOnly?: boolean;
	/** How often to re-check a lock that is already taken. */
	pollMs?: number;
	fs?: Fs;
	ps?: Ps;
	log?: Logger;
}

/**
 * A mutex between processes, held by a directory on disk. A holder that died
 * is detected and its lock stolen, and the directory is removed on signals and
 * uncaught exceptions.
 */
export class FileLock implements Lock {
	private held = false;
	/** The process listeners that remove the lock, while it is held. */
	private listeners: Disposer | null = null;
	private readonly stalenessMs: number;
	private readonly pollMs: number;
	private readonly pidOnly: boolean;

	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly log: Logger;

	constructor(
		readonly path: string,
		opts: FileLockOptions = {},
	) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.log = opts.log ?? new ConsoleLogger();
		this.stalenessMs = opts.stalenessMs ?? 60_000;
		this.pollMs = opts.pollMs ?? 2_000;
		this.pidOnly = opts.pidOnly ?? false;
	}

	async acquire(): Promise<void> {
		// `mkdir` is the whole mechanism: it is atomic on every filesystem and
		// either creates the directory or fails, so there is no check-then-write
		// window to lose.
		let unreadableSince: number | null = null;
		// Short first waits so a lock freed quickly is picked up quickly, backing
		// off to `pollMs` for a holder that is settling in for a long test run.
		let sleepMs = 5;

		for (let waited = false; ; waited = true) {
			try {
				await this.fs.mkdir(this.path, { recursive: false });
			} catch {
				const holder = await this.holder();
				if (holder === null) {
					// A holder that has not written its metadata yet: give the winner
					// time to finish before deciding the directory is orphaned.
					unreadableSince ??= Date.now();
					if (Date.now() - unreadableSince > this.stalenessMs) {
						unreadableSince = null;
						this.steal("it has no holder metadata");
						continue;
					}
				} else if (this.isStale(holder)) {
					this.steal(`holder pid ${holder.pid} is gone or stale`);
					continue;
				}
				await sleep(Duration.ms(sleepMs));
				sleepMs = Math.min(sleepMs * 2, this.pollMs);
				continue;
			}
			if (waited) {
				this.log.error(`acquired ${this.path} after waiting`);
			}
			break;
		}

		this.held = true;
		await this.fs.write(
			this.holderPath,
			JSON.stringify({
				pid: this.ps.pid,
				hostname: this.ps.hostname,
				at: new Date().toISOString(),
			} satisfies Holder),
		);
		this.registerCleanup();
	}

	// scry-ignore resources-are-disposable: the lock outlives each hold, so release is the other half of acquire and leaves it ready to acquire again, not a teardown
	async release(): Promise<void> {
		this.listeners?.dispose();
		this.listeners = null;
		if (this.held) {
			this.held = false;
			await this.fs.rm(this.path, { recursive: true, force: true });
		}
	}

	async releaseIfOurs(): Promise<void> {
		const holder = await this.holder();
		if (holder?.pid === this.ps.pid && this.sameHost(holder)) {
			this.held = true;
			await this.release();
		}
	}

	private get holderPath(): string {
		return `${this.path}/holder.json`;
	}

	private async holder(): Promise<Holder | null> {
		const raw = await this.fs.read(this.holderPath).catch(() => null);
		try {
			return raw === null ? null : (JSON.parse(raw) as Holder);
		} catch {
			return null;
		}
	}

	private isStale(holder: Holder): boolean {
		// On this host the pid alone decides: nothing refreshes `at` while the
		// lock is held, so judged by age a holder in a long test run would lose
		// its lock to the next waiter. `at` only judges a holder on another host,
		// whose pid cannot be checked.
		if (this.sameHost(holder)) {
			return !this.ps.alive(holder.pid);
		}
		return Date.now() - Date.parse(holder.at) > this.stalenessMs;
	}

	private sameHost(holder: Holder): boolean {
		return this.pidOnly || holder.hostname === this.ps.hostname;
	}

	private steal(why: string): void {
		this.log.error(color.yellow(`stealing stale lock ${this.path} (${why})`));
		rmSync(this.path, { recursive: true, force: true });
	}

	/**
	 * A crashed holder that never releases wedges every other waiter, so the
	 * removal has to survive signals and uncaught exceptions. It is sync
	 * because exit handlers cannot await.
	 */
	private registerCleanup(): void {
		if (this.listeners !== null) {
			return;
		}
		const listeners = new Disposer();
		this.listeners = listeners;
		const drop = (): void => {
			if (this.held) {
				this.held = false;
				rmSync(this.path, { recursive: true, force: true });
			}
		};
		listeners.use(this.ps.once("exit", drop));
		for (const signal of ["SIGINT", "SIGTERM"]) {
			listeners.use(
				this.ps.on(signal, () => {
					drop();
					this.ps.exit(130);
				}),
			);
		}
		listeners.use(
			this.ps.on("uncaughtException", (error: unknown) => {
				drop();
				this.log.error(error);
				this.ps.exit(1);
			}),
		);
	}
}
