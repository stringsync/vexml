/* The read side of an EventTarget: subscribe and unsubscribe, with the event map fixing what
 * types exist and what each one carries. Handed out by whoever raises the events (Score,
 * CursorController), so a listener cannot dispatch. */
export interface Listenable<M extends Record<keyof M, unknown>> {
	addEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;

	removeEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;
}
