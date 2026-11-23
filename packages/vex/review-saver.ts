import { Disposer, type Resource } from 'core/disposable';
import { Dispatcher, type Events } from 'core/events';
import { Debouncer, Duration, type Timer } from 'core/time';
import type { Review } from './review-data';

/** Whether the latest change reached vex: `saved`, `saving`, or `failed` to save. */
export type SaveState = 'saved' | 'saving' | 'failed';

export interface ReviewSaveRequest {
	review: Review;
	seq: number;
	clientId: string;
	keepalive: boolean;
}

export interface ReviewTransport {
	put(request: ReviewSaveRequest): Promise<boolean>;
}

export type ReviewSaverEventMap = {
	change: SaveState;
};

export interface ReviewSaverOptions {
	transport: ReviewTransport;
	timer: Timer;
	clientId: string;
	delay?: Duration;
}

interface Waiter {
	targetSeq: number;
	resolve: (ok: boolean) => void;
}

/**
 * Serializes and coalesces `vex review` state saves so at most one PUT is in flight at a
 * time, debounced edits flush immediately on submit or approval, and dirty state flushes
 * with `keepalive` if the tab closes mid-edit.
 */
export class ReviewSaver implements Resource {
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<ReviewSaverEventMap>(),
	);
	private readonly debouncer: Debouncer;
	private readonly transport: ReviewTransport;
	private readonly clientId: string;

	readonly events: Events<ReviewSaverEventMap> = this.dispatcher.events;

	private currentState: SaveState = 'saved';
	private latest: Review | null = null;
	private latestSeq = 0;
	private savedSeq = 0;
	private inFlightSeq = 0;
	private sentKeepaliveSeq = 0;
	private readyToSend = false;
	private pumping = false;
	private waiters: Waiter[] = [];

	constructor(opts: ReviewSaverOptions) {
		this.transport = opts.transport;
		this.clientId = opts.clientId;
		this.debouncer = this.disposer.use(
			new Debouncer(opts.timer, opts.delay ?? Duration.ms(400)),
		);
		this.disposer.defer(() => {
			for (const waiter of this.waiters) {
				waiter.resolve(false);
			}
			this.waiters = [];
		});
	}

	/** Current persistence state for the latest edit. */
	state(): SaveState {
		return this.currentState;
	}

	/** Queues a debounced save (used while typing notes or replies). */
	schedule(review: Review): void {
		if (this.disposer.disposed) {
			return;
		}
		this.latest = review;
		this.latestSeq++;
		this.setState('saving');
		this.debouncer.call(() => {
			this.readyToSend = true;
			void this.pump();
		});
	}

	/**
	 * Cancels any pending debounce and saves the latest review immediately, resolving once
	 * this snapshot (or a newer one) has been persisted or failed.
	 */
	flush(review?: Review): Promise<boolean> {
		if (this.disposer.disposed) {
			return Promise.resolve(false);
		}
		if (review !== undefined) {
			this.latest = review;
			this.latestSeq++;
		}
		this.debouncer.cancel();
		const targetSeq = this.latestSeq;
		if (this.latest === null || targetSeq <= this.savedSeq) {
			return Promise.resolve(true);
		}
		this.setState('saving');
		if (this.inFlightSeq < targetSeq) {
			this.readyToSend = true;
		}
		const promise = new Promise<boolean>((resolve) => {
			this.waiters.push({ targetSeq, resolve });
		});
		void this.pump();
		return promise;
	}

	/**
	 * Best-effort save during page unload (`pagehide`/`beforeunload`): sends the latest
	 * unsaved state with `keepalive: true` at most once per revision.
	 */
	flushKeepalive(): void {
		if (this.disposer.disposed) {
			return;
		}
		this.debouncer.cancel();
		if (
			this.latest === null ||
			this.latestSeq <= this.savedSeq ||
			this.sentKeepaliveSeq >= this.latestSeq
		) {
			return;
		}
		this.sentKeepaliveSeq = this.latestSeq;
		void this.transport
			.put({
				review: this.latest,
				seq: this.latestSeq,
				clientId: this.clientId,
				keepalive: true,
			})
			.catch(() => false);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private async pump(): Promise<void> {
		if (this.pumping) {
			return;
		}
		this.pumping = true;
		try {
			while (
				!this.disposer.disposed &&
				this.readyToSend &&
				this.latest !== null &&
				this.latestSeq > this.savedSeq
			) {
				this.readyToSend = false;
				const review = this.latest;
				const seq = this.latestSeq;
				this.inFlightSeq = seq;
				let ok = false;
				try {
					ok = await this.transport.put({
						review,
						seq,
						clientId: this.clientId,
						keepalive: false,
					});
				} catch {
					ok = false;
				} finally {
					this.inFlightSeq = 0;
				}
				if (this.disposer.disposed) {
					return;
				}
				if (ok) {
					this.savedSeq = Math.max(this.savedSeq, seq);
					this.resolveWaitersUpTo(this.savedSeq, true);
					if (this.latestSeq === this.savedSeq) {
						this.setState('saved');
					}
				} else {
					this.resolveWaitersUpTo(seq, false);
					if (!this.readyToSend && this.latestSeq === seq) {
						this.setState('failed');
					}
				}
			}
		} finally {
			this.pumping = false;
		}
		if (
			!this.disposer.disposed &&
			this.readyToSend &&
			this.latest !== null &&
			this.latestSeq > this.savedSeq
		) {
			void this.pump();
		}
	}

	private resolveWaitersUpTo(seq: number, ok: boolean): void {
		if (this.waiters.length === 0) {
			return;
		}
		const remaining: Waiter[] = [];
		for (const waiter of this.waiters) {
			if (waiter.targetSeq <= seq) {
				waiter.resolve(ok);
			} else {
				remaining.push(waiter);
			}
		}
		this.waiters = remaining;
	}

	private setState(next: SaveState): void {
		if (this.currentState === next) {
			return;
		}
		this.currentState = next;
		this.dispatcher.dispatch('change', next);
	}
}
