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

	private poll = disposables.noop();
	private wasActive = navigator.userActivation.isActive;

	constructor(private readonly timer: Timer) {
		for (const event of ACTIVATION_EVENTS) {
			window.addEventListener(event, this.onActivation);
			this.disposer.defer(() =>
				window.removeEventListener(event, this.onActivation),
			);
		}
		this.disposer.defer(() => this.stopPolling());
	}

	isActive(): boolean {
		return navigator.userActivation.isActive;
	}

	hasBeenActive(): boolean {
		return navigator.userActivation.hasBeenActive;
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
		if (this.wasActive || !navigator.userActivation.isActive) {
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
		if (navigator.userActivation.isActive) {
			return;
		}
		this.wasActive = false;
		this.stopPolling();
		this.dispatcher.dispatch("change");
	};
}
