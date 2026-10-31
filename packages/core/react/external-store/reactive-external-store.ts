import { Disposer } from "core/disposable";
import type { Eventful, EventMapOf } from "core/events";
import type { ExternalStore } from "./external-store";
import { shallowEqual } from "./shallow-equal";

/**
 * Projects part of an `Eventful` source into a snapshot, recomputing it when
 * any of the named events fire and notifying React only when the projection
 * actually changed (compared shallowly).
 *
 * The methods are arrow properties so their identity survives being passed to
 * `useSyncExternalStore` on every render.
 */
export class ReactiveExternalStore<
	Source extends Eventful<Record<string, unknown>>,
	State,
> implements ExternalStore<State>
{
	private state: State;

	// scry-ignore objects-over-callbacks: a selector is the React idiom, and an interface around one pure projection adds nothing
	constructor(
		private source: Source,
		private select: (source: Source) => State,
		private events: Array<string & keyof EventMapOf<Source>>,
	) {
		this.state = this.select(this.source);
	}

	subscribe = (onStoreChange: () => void): (() => void) => {
		const disposer = new Disposer();

		const reconcile = () => {
			const next = this.select(this.source);
			if (!shallowEqual(this.state, next)) {
				this.state = next;
				onStoreChange();
			}
		};

		for (const event of this.events) {
			disposer.defer(this.source.events.on(event, reconcile));
		}

		// The source may have moved between construction and subscription.
		reconcile();

		return () => {
			disposer.dispose();
		};
	};

	getSnapshot = (): State => this.state;

	getServerSnapshot = (): State => this.state;
}
