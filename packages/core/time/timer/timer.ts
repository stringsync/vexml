import type { Resource } from "core/disposable";
import type { Duration } from "../duration";

/**
 * Scheduling of future work. Both methods hand back a `Resource` rather than
 * an id, so cancelling is the same move as releasing any other resource and a
 * pending callback cannot outlive the thing that scheduled it.
 */
// scry-ignore objects-over-callbacks: the signature the platform's own setTimeout and setInterval have, so events would mean every caller subscribing to a one-shot they already wrote as a closure
export interface Timer {
	setTimeout(callback: () => void, delay: Duration): Resource;
	setInterval(callback: () => void, interval: Duration): Resource;
}
