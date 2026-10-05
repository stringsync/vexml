export class Watcher {
	close(): void {
		this.unlisten();
	}
}
