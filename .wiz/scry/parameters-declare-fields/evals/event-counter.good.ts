export class EventCounter {
	private readonly counts = new Map<string, number>();
	private total = 0;

	record(event: string): void {
		this.counts.set(event, (this.counts.get(event) ?? 0) + 1);
		this.total += 1;
	}

	share(event: string): number {
		return this.total === 0 ? 0 : (this.counts.get(event) ?? 0) / this.total;
	}
}
