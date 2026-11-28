import { Disposer, disposables, type Resource } from "core/disposable";
import { Dispatcher } from "core/events";
import { Duration, type Timer } from "core/time";
import type {
	UserActivationObserver,
	UserActivationObserverEventMap,
} from "./user-activation-observer";

const ACTIVATION_EVENTS = [
	"mousedown",
	"pointerdown",
	"pointerup",
	"touchend",
] as const;

const LAPSE_POLL_INTERVAL = Duration.secs(1);

export interface WindowUserActivationObserverOptions {
	window?: EventTarget;
	userActivation?: Pick<UserActivation, "isActive" | "hasBeenActive">;
}

/**
 * A `UserActivationObserver` over `navigator.userActivation`.
 */
export class WindowUserActivationObserver
	implements UserActivationObserver, Resource
{
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<UserActivationObserverEventMap>(),
	);
	readonly events = this.dispatcher.events;

	private readonly win: EventTarget;
	private readonly activation: Pick<
		UserActivation,
		"isActive" | "hasBeenActive"
	>;
	private poll = disposables.noop();
	private wasActive: boolean;

	constructor(
		private readonly timer: Timer,
		opts: WindowUserActivationObserverOptions = {},
	) {
		this.win = opts.window ?? window;
		this.activation = opts.userActivation ?? navigator.userActivation;
		this.wasActive = this.activation.isActive;

		for (const event of ACTIVATION_EVENTS) {
			this.win.addEventListener(event, this.onActivation);
			this.disposer.defer(() =>
				this.win.removeEventListener(event, this.onActivation),
			);
		}
		this.disposer.defer(() => this.stopPolling());
	}

	isActive(): boolean {
		return this.activation.isActive;
	}

	hasBeenActive(): boolean {
		return this.activation.hasBeenActive;
	}

	wait(): Promise<void> {
		if (this.hasBeenActive()) {
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			this.events.on(
				"change",
				() => {
					if (this.hasBeenActive()) {
						resolve();
					}
				},
				{ once: true },
			);
		});
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private onActivation = () => {
		if (this.wasActive || !this.activation.isActive) {
			return;
		}
		this.wasActive = true;
		this.dispatcher.dispatch("change");
		this.startPolling();
	};

	// Transient activation expires on a timer of the browser's choosing and
	// there is no event for it, so the only way to notice is to look.
	private startPolling(): void {
		this.stopPolling();
		this.poll = this.timer.setInterval(this.detectLapse, LAPSE_POLL_INTERVAL);
	}

	private stopPolling(): void {
		this.poll.dispose();
	}

	private detectLapse = () => {
		if (this.activation.isActive) {
			return;
		}
		this.wasActive = false;
		this.stopPolling();
		this.dispatcher.dispatch("change");
	};
}
