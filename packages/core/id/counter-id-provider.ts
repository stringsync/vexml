import type { IdProvider } from "./id-provider";

/** Counts up from zero, so a test can say which id it expects. */
export class CounterIdProvider implements IdProvider {
	private counter = 0;

	next(): string {
		return String(this.counter++);
	}
}
