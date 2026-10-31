import type { Eventful, EventMapOf } from "core/events";
import { useRef } from "react";
import { ReactiveExternalStore } from "./external-store/reactive-external-store";
import { useExternalStore } from "./use-external-store";

/**
 * Reads a projection of an `Eventful` source, re-rendering when any of the
 * named events changes what `select` returns.
 *
 * The store is built once per source: when `source` changes identity (a
 * `useResource` instance rebuilt after StrictMode retired it, or after its
 * deps changed) the hook builds a fresh store and re-subscribes to the new
 * source. `select` is read through a ref, so an inline arrow that closes over
 * fresh props still sees the latest values without re-subscribing. `events` is
 * read only when a store is built, so pass a fixed list.
 */
export function useReactive<
	Source extends Eventful<Record<string, unknown>>,
	State,
>(
	source: Source,
	// scry-ignore objects-over-callbacks: a projection run to compute what the hook returns, which the guide calls fine; the ref only keeps a fresh inline arrow from re-subscribing
	select: (source: Source) => State,
	events: Array<string & keyof EventMapOf<Source>>,
): State {
	const selectRef = useRef(select);
	selectRef.current = select;

	// A manual ref memo rather than useMemo, so the store, and with it the
	// subscription, is rebuilt only when the source changes.
	const memo = useRef<{
		source: Source;
		store: ReactiveExternalStore<Source, State>;
	} | null>(null);
	if (memo.current === null || memo.current.source !== source) {
		memo.current = {
			source,
			store: new ReactiveExternalStore(
				source,
				(source: Source) => selectRef.current(source),
				events,
			),
		};
	}

	return useExternalStore(memo.current.store);
}
