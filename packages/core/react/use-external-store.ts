import { useSyncExternalStore } from "react";
import type { ExternalStore } from "./external-store/external-store";

/** Subscribes to an `ExternalStore` and returns its current snapshot. */
export function useExternalStore<Snapshot>(
	store: ExternalStore<Snapshot>,
): Snapshot {
	return useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getServerSnapshot,
	);
}
