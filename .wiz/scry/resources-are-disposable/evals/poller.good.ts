import { type Resource, Disposer } from "webappwiz/disposable";

export class Poller implements Resource {
	private disposer = new Disposer();

	constructor(timer: Timer, source: Source) {
		this.disposer.use(timer.setInterval(() => this.poll(), Duration.seconds(5)));
		this.disposer.use(source.events.on("changed", () => this.poll()));
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
