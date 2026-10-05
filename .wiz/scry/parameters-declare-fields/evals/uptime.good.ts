export class Uptime {
	private readonly since: number;

	constructor(started: Date) {
		this.since = started.getTime();
	}
}
