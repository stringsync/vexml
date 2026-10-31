import { Disposer, type Resource } from "core/disposable";
import { Dispatcher } from "core/events";
import type { Clock, Duration } from "core/time";
import { type Frame, raf } from "./raf";

export type AnimationLoopEventMap = {
	/** One frame has come round, `dt` after the last. */
	frame: { dt: Duration };
};

/**
 * Raises a `frame` event every animation frame between `start` and `stop`,
 * with the time since the previous one.
 *
 * ```ts
 * const loop = new AnimationLoop(clock);
 * loop.events.on("frame", ({ dt }) => cursor.advance(dt));
 * loop.start();
 * ```
 *
 * Each frame asks for the next, so a loop nobody stops runs until it is
 * disposed. Disposing stops it.
 */
export class AnimationLoop implements Resource {
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<AnimationLoopEventMap>(),
	);
	readonly events = this.dispatcher.events;

	private frame: Frame | null = null;
	private running = false;

	constructor(private readonly clock: Clock) {
		this.disposer.defer(() => this.stop());
	}

	isRunning(): boolean {
		return this.running;
	}

	start(): void {
		if (this.running) {
			return;
		}
		this.running = true;
		this.frame = raf(this.clock, this.onFrame);
	}

	stop(): void {
		if (!this.running) {
			return;
		}
		this.running = false;
		this.frame?.dispose();
		this.frame = null;
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private onFrame = (dt: Duration) => {
		this.dispatcher.dispatch("frame", { dt });
		// Checked again after dispatching, since a listener is free to stop the
		// loop and must not have another frame queued behind it.
		if (this.running) {
			this.frame = raf(this.clock, this.onFrame);
		}
	};
}
