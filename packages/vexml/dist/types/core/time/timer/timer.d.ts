import type { Resource } from "../../disposable/index.js";
import type { Duration } from "../duration.js";
/**
 * Scheduling of future work. Both methods hand back a `Resource` rather than
 * an id, so cancelling is the same move as releasing any other resource and a
 * pending callback cannot outlive the thing that scheduled it.
 */
export interface Timer {
    setTimeout(callback: () => void, delay: Duration): Resource;
    setInterval(callback: () => void, interval: Duration): Resource;
}
