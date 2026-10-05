export class Poller implements Resource {
	private timeouts = [] as number[];
	private unlisteners = [] as (() => void)[];

	dispose(): void {
		for (const id of this.timeouts) clearTimeout(id);
		for (const unlisten of this.unlisteners) unlisten();
	}
}
