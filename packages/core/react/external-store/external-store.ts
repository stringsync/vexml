/**
 * A source `useExternalStore` can subscribe to: the `useSyncExternalStore`
 * contract, as an object so the three calls travel together.
 *
 * The methods must keep a stable identity across renders. Bind them in the
 * constructor or write them as arrow properties; a `.bind()` at the call site
 * makes React tear down and rebuild the subscription every render.
 */
export interface ExternalStore<Snapshot> {
	subscribe(onStoreChange: () => void): () => void;
	getSnapshot(): Snapshot;
	getServerSnapshot(): Snapshot;
}
