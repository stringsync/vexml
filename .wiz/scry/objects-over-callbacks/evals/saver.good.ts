export class Saver {
	private dispatcher = new Dispatcher<{ saved: string }>();
	readonly events: Events<{ saved: string }> = this.dispatcher.events;

	save(path: string): void {
		this.dispatcher.dispatch("saved", path);
	}
}
