class Entry<K, V> {
	prev: Entry<K, V> | null = null;
	next: Entry<K, V> | null = null;

	constructor(
		readonly key: K,
		public value: V,
	) {}
}

export class LruCache<K, V> {
	private readonly entries = new Map<K, Entry<K, V>>();
	private head: Entry<K, V> | null = null;

	constructor(private readonly capacity: number) {}

	get(key: K): V | undefined {
		return this.entries.get(key)?.value;
	}

	set(key: K, value: V): void {
		const entry = new Entry(key, value);
		entry.next = this.head;
		this.head = entry;
		this.entries.set(key, entry);
	}
}
