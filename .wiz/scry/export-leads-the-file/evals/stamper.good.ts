export class Stamper {
	constructor(private clock: Clock) {}

	stamp(message: string): string {
		return `${pad(this.clock.now())} ${message}`;
	}
}

function pad(at: Date): string {
	return at.toISOString().padStart(24, "0");
}
