import type { Resource } from "core/disposable";
import type { Duration } from "../duration";
import type { Timer } from "./timer";

interface Entry {
	callback: () => void;
	delay: Duration;
	disposed: boolean;
}

/**
 * A {@link Timer} whose callbacks fire only when the test drives them, so tests
 * about scheduled work do not have to wait for real time to pass.
 */
export class FakeTimer implements Timer {
	readonly timeouts: Entry[] = [];
	readonly intervals: Entry[] = [];

	setTimeout(callback: () => void, delay: Duration): Resource {
		return this.add(this.timeouts, callback, delay);
	}

	setInterval(callback: () => void, interval: Duration): Resource {
		return this.add(this.intervals, callback, interval);
	}

	fireTimeouts(): void {
		const pending = this.timeouts.filter((entry) => !entry.disposed);
		this.timeouts.length = 0;
		for (const entry of pending) {
			entry.callback();
		}
	}

	/**
	 * Fires a single pending timeout by registration order, leaving the rest
	 * pending, for when nested deadlines race and only the outer one should go.
	 */
	fireTimeout(index: number): void {
		const entry = this.timeouts[index];
		if (entry && !entry.disposed) {
			entry.disposed = true;
			entry.callback();
		}
	}

	fireIntervals(): void {
		for (const entry of [...this.intervals]) {
			if (!entry.disposed) {
				entry.callback();
			}
		}
	}

	private add(
		entries: Entry[],
		callback: () => void,
		delay: Duration,
	): Resource {
		const entry: Entry = { callback, delay, disposed: false };
		entries.push(entry);
		return {
			dispose() {
				entry.disposed = true;
			},
		};
	}
}
