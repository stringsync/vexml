export type Listener<T> = (event: T) => void;
export type Unlisten = () => void;
export type AnyListener<T, E> = (type: T, event: E) => void;

export type ListenerOptions = {
	once?: boolean;
};

/**
 * The read side of a `Dispatcher`. Hand this out to whoever needs to react to
 * something; keep the dispatcher itself with whoever raises it.
 */
export interface Events<T extends Record<string, unknown>> {
	on<K extends keyof T>(
		type: K,
		listener: Listener<T[K]>,
		opts?: ListenerOptions,
	): Unlisten;

	all<K extends keyof T>(
		listener: AnyListener<K, T[K]>,
		opts?: ListenerOptions,
	): Unlisten;
}
