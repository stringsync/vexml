/*
 * Which tile bitmaps a surface keeps, least recently used first. Bitmaps are what a browser runs
 * out of (iOS WebKit kills the page past its canvas memory), so a surface holds the tiles in view
 * and as many recent others as fit the limit, and drops the rest; they repaint from their op
 * lists when they come back. Areas are in device pixels.
 */
export class TileBudget<K> {
	// Map iteration is insertion order, so re-inserting on use keeps the oldest first.
	private readonly areas = new Map<K, number>();
	private total = 0;

	constructor(readonly limit: number) {}

	get used(): number {
		return this.total;
	}

	use(key: K, area: number): void {
		this.total -= this.areas.get(key) ?? 0;
		this.areas.delete(key);
		this.areas.set(key, area);
		this.total += area;
	}

	drop(key: K): void {
		this.total -= this.areas.get(key) ?? 0;
		this.areas.delete(key);
	}

	/* The keys to free, oldest first, to get back under the limit without touching `keep`. They're
	 * dropped from the budget as they're returned. Never frees `keep`, so a view bigger than the
	 * limit stays over it. */
	trim(keep: ReadonlySet<K>): K[] {
		const freed: K[] = [];
		for (const [key, area] of this.areas) {
			if (this.total <= this.limit) {
				break;
			}
			if (!keep.has(key)) {
				freed.push(key);
				this.areas.delete(key);
				this.total -= area;
			}
		}
		return freed;
	}
}
