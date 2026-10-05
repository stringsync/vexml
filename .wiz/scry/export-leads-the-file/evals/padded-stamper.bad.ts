function pad(at: Date): string {
	return at.toISOString().padStart(24, "0");
}

export class Stamper {
	stamp(message: string): string {
		return `${pad(this.clock.now())} ${message}`;
	}
}
