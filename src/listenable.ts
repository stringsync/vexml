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
