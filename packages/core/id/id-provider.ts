/**
 * A source of identifiers, so code that has to name something does not decide
 * how. Inject `CounterIdProvider` in tests and the ids stop being noise.
 */
export interface IdProvider {
	next(): string;
}
