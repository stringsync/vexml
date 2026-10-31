import type { Resource } from "core/disposable";
import type {
	AnyListener,
	Events,
	Listener,
	ListenerOptions,
	Unlisten,
} from "./events";

type ListenerEntry<T extends Record<string, unknown>> = {
	once: boolean;
	id: number;
	order: number;
} & (
	| { kind: "scoped"; listener: Listener<T[keyof T]> }
	| { kind: "universal"; typeListener: AnyListener<keyof T, T[keyof T]> }
);

/**
 * Raises typed events. The owner keeps the dispatcher and calls `dispatch`;
 * everyone else gets `events` and can only listen.
 */
export class Dispatcher<T extends Record<string, unknown>>
	implements Events<T>, Resource
{
	readonly events: Events<T> = this;

	private scopedEntries = new Map<keyof T, ListenerEntry<T>[]>();
	private universalEntries = [] as ListenerEntry<T>[];
	private nextId = 0;
	private nextOrder = 0;

	on<K extends keyof T>(
		type: K,
		listener: Listener<T[K]>,
		opts?: ListenerOptions,
	): Unlisten {
		const id = this.nextId++;
		const entries = this.scopedEntries.get(type) ?? [];
		entries.push({
			kind: "scoped",
			listener: listener as Listener<T[keyof T]>,
			once: opts?.once ?? false,
			id,
			order: this.nextOrder++,
		});
		this.scopedEntries.set(type, entries);
		return () => this.off(id);
	}

	all<K extends keyof T>(
		typeListener: AnyListener<K, T[K]>,
		opts?: ListenerOptions,
	): Unlisten {
		const id = this.nextId++;
		this.universalEntries.push({
			kind: "universal",
			typeListener: typeListener as AnyListener<keyof T, T[keyof T]>,
			once: opts?.once ?? false,
			id,
			order: this.nextOrder++,
		});
		return () => this.off(id);
	}

	dispatch<K extends keyof T>(
		type: K,
		...args: T[K] extends undefined ? [] : [event: T[K]]
	): void {
		// Sorted by registration order so a universal listener added before a
		// scoped one still runs first.
		const entries = [
			...(this.scopedEntries.get(type) ?? []),
			...this.universalEntries,
		].sort((left, right) => left.order - right.order);
		const event = args[0] as T[K];
		for (const entry of entries) {
			if (entry.kind === "scoped") {
				entry.listener(event);
			} else {
				entry.typeListener(type, event);
			}
			if (entry.once) {
				this.off(entry.id);
			}
		}
	}

	dispose(): void {
		this.scopedEntries.clear();
		this.universalEntries.length = 0;
	}

	private off(id: number): void {
		for (const [type, entries] of this.scopedEntries) {
			const kept = entries.filter((entry) => entry.id !== id);
			if (kept.length !== entries.length) {
				this.scopedEntries.set(type, kept);
			}
		}
		this.universalEntries = this.universalEntries.filter(
			(entry) => entry.id !== id,
		);
	}
}
