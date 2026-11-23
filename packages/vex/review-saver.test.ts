import { describe, expect, it } from 'bun:test';
import { Duration } from 'core/time';
import { FakeTimer } from 'core/time/testing';
import { emptyReview, type Review } from './review-data';
import {
	type ReviewSaveRequest,
	ReviewSaver,
	type ReviewTransport,
	type SaveState,
} from './review-saver';

describe('ReviewSaver', () => {
	it('serializes in-flight PUTs and coalesces rapid approvals plus submit into one final save', async () => {
		const { saver, transport, states } = makeSaver();

		// First approval starts immediately and stays in flight.
		const firstDone = saver.flush(reviewWith(1));
		expect(transport.inFlight).toHaveLength(1);
		expect(states).toEqual(['saving']);

		// Approve 77 more snapshots and press Submit while the first PUT is still in flight.
		flushApprovalRange(saver, 2, 78);
		const submitDone = saver.flush(reviewWith(78, true));

		// Never sends concurrent overlapping PUTs.
		expect(transport.inFlight).toHaveLength(1);
		expect(transport.maxConcurrent).toBe(1);

		// First PUT settles; saver sends one coalesced PUT with all 78 approvals and submitted=true.
		transport.finishNext(true);
		await flushMicrotasks();
		expect(await firstDone).toBe(true);
		expect(states).toEqual(['saving']);
		expect(transport.inFlight).toHaveLength(1);
		expect(transport.inFlight[0]?.request).toMatchObject({
			seq: 79,
			keepalive: false,
			review: reviewWith(78, true),
		});

		// Final PUT settles; submit resolves true and state flips to saved.
		transport.finishNext(true);
		expect(await submitDone).toBe(true);
		expect(states).toEqual(['saving', 'saved']);
		expect(transport.requests).toHaveLength(2);
		saver.dispose();
	});

	it('cancels a pending debounce timer and saves immediately on submit', async () => {
		const { saver, timer, transport, states } = makeSaver({ autoResult: true });

		saver.schedule(reviewWith(6));
		expect(transport.requests).toHaveLength(0);

		const ok = await saver.flush(reviewWith(6, true));
		expect(ok).toBe(true);
		expect(transport.requests).toEqual([
			{
				clientId: 'tab-1',
				keepalive: false,
				seq: 2,
				review: reviewWith(6, true),
			},
		]);

		// Firing timers after flush must not send a stale PUT.
		timer.fireTimeouts();
		await flushMicrotasks();
		expect(transport.requests).toHaveLength(1);
		expect(states).toEqual(['saving', 'saved']);
		saver.dispose();
	});

	it('reports failed state on error and recovers on a subsequent flush', async () => {
		const { saver, transport, states } = makeSaver();

		const first = saver.flush(reviewWith(3, true));
		transport.finishNext(false);
		expect(await first).toBe(false);
		expect(states).toEqual(['saving', 'failed']);

		const retry = saver.flush(reviewWith(3, true));
		transport.finishNext(true);
		expect(await retry).toBe(true);
		expect(states).toEqual(['saving', 'failed', 'saving', 'saved']);
		saver.dispose();
	});

	it('flushes dirty state once with keepalive on unload and skips when already saved', async () => {
		const { saver, timer, transport } = makeSaver();

		// Nothing dirty: keepalive is a no-op.
		saver.flushKeepalive();
		expect(transport.requests).toHaveLength(0);

		// Dirty debounced edit: keepalive flushes once even if both beforeunload and pagehide fire.
		saver.schedule(reviewWith(12));
		saver.flushKeepalive();
		saver.flushKeepalive();
		expect(transport.requests).toEqual([
			{
				clientId: 'tab-1',
				keepalive: true,
				seq: 1,
				review: reviewWith(12),
			},
		]);

		// Debounce timer was cancelled by unload flush.
		timer.fireTimeouts();
		await flushMicrotasks();
		expect(transport.requests).toHaveLength(1);
		saver.dispose();
	});
});

interface PendingSend {
	request: ReviewSaveRequest;
	resolve: (ok: boolean) => void;
}

class FakeTransport implements ReviewTransport {
	readonly requests: ReviewSaveRequest[] = [];
	readonly inFlight: PendingSend[] = [];
	maxConcurrent = 0;

	constructor(private readonly autoResult: boolean | null = null) {}

	put(request: ReviewSaveRequest): Promise<boolean> {
		this.requests.push(request);
		if (request.keepalive || this.autoResult !== null) {
			return Promise.resolve(this.autoResult ?? true);
		}
		return new Promise<boolean>((resolve) => {
			this.inFlight.push({ request, resolve });
			this.maxConcurrent = Math.max(this.maxConcurrent, this.inFlight.length);
		});
	}

	finishNext(ok: boolean): ReviewSaveRequest {
		const next = this.inFlight.shift();
		if (!next) {
			throw new Error('no in-flight request');
		}
		next.resolve(ok);
		return next.request;
	}
}

function makeSaver(opts: { autoResult?: boolean } = {}) {
	const timer = new FakeTimer();
	const transport = new FakeTransport(opts.autoResult ?? null);
	const states: SaveState[] = [];
	const saver = new ReviewSaver({
		transport,
		timer,
		delay: Duration.ms(400),
		clientId: 'tab-1',
	});
	saver.events.on('change', (state) => states.push(state));
	return { saver, timer, transport, states };
}

function reviewWith(verdictCount: number, submitted = false): Review {
	const verdicts: Review['verdicts'] = {};
	for (let i = 1; i <= verdictCount; i++) {
		verdicts[`snap_${i}.png`] = 'approved';
	}
	return {
		...emptyReview({ id: 'vexflow-update', version: 1 }),
		verdicts,
		submitted,
	};
}

function flushApprovalRange(saver: ReviewSaver, from: number, to: number) {
	for (let i = from; i <= to; i++) {
		void saver.flush(reviewWith(i));
	}
}

async function flushMicrotasks(): Promise<void> {
	for (let i = 0; i < 6; i++) {
		await Promise.resolve();
	}
}
