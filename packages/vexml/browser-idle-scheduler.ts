import { disposables, type Resource } from 'core/disposable';
import type { IdleScheduler, IdleSlice } from './idle-scheduler';

// A slice runs within this long of being asked for even when the thread never goes idle, so a
// page that animates still finishes its score.
const IDLE_TIMEOUT_MS = 100;
// Where requestIdleCallback is missing (Safari), a slice runs on a timeout with this much to
// spend: a few frames' worth of work at most, leaving the thread free between slices.
const FALLBACK_SLICE_MS = 8;

/* The browser's idle time: requestIdleCallback with a timeout, so the slices keep coming under
 * load, and a short timeout where the browser has no idle callback. */
export class BrowserIdleScheduler implements IdleScheduler {
	request(slice: (budget: IdleSlice) => void): Resource {
		if (typeof requestIdleCallback === 'function') {
			const id = requestIdleCallback((deadline) => slice(deadline), {
				timeout: IDLE_TIMEOUT_MS,
			});
			return disposables.callback(() => cancelIdleCallback(id));
		}
		const id = setTimeout(() => {
			const started = performance.now();
			slice({
				timeRemaining: () =>
					Math.max(0, FALLBACK_SLICE_MS - (performance.now() - started)),
			});
		}, 0);
		return disposables.callback(() => clearTimeout(id));
	}
}
