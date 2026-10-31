import { Disposer, type Resource } from "core/disposable";
import { Dispatcher } from "core/events";
import type {
	BackgroundObserver,
	BackgroundObserverEventMap,
} from "./background-observer";

const EVENTS = ["visibilitychange", "focus", "blur", "pageshow"] as const;

/**
 * A `BackgroundObserver` over the window: the page counts as backgrounded when
 * it is not visible or does not have focus.
 */
export class WindowBackgroundObserver implements BackgroundObserver, Resource {
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<BackgroundObserverEventMap>(),
	);
	readonly events = this.dispatcher.events;

	private backgrounded = this.compute();

	constructor() {
		for (const event of EVENTS) {
			// visibilitychange only fires on the document, and the rest only on the
			// window, so both are listened to and every one recomputes the same way.
			const target: EventTarget =
				event === "visibilitychange" ? document : window;
			target.addEventListener(event, this.onChange);
			this.disposer.defer(() =>
				target.removeEventListener(event, this.onChange),
			);
		}
	}

	isBackgrounded(): boolean {
		return this.backgrounded;
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private onChange = () => {
		const next = this.compute();
		if (next === this.backgrounded) {
			return;
		}
		this.backgrounded = next;
		this.dispatcher.dispatch("change");
	};

	// Visibility alone misses a switch between two desktop windows, and focus
	// alone misses a mobile app switch that fires visibilitychange without a
	// blur, so the page is in the foreground only when both agree.
	private compute(): boolean {
		return document.visibilityState !== "visible" || !document.hasFocus();
	}
}
