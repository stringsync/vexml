export class Poller {
	constructor(timer: Timer, source: Source) {
		timer.setInterval(() => this.poll(), Duration.seconds(5));
		source.events.on("changed", () => this.poll());
	}
}
