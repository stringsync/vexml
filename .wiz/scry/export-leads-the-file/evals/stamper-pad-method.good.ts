export class Stamper {
	stamp(message: string): string {
		return `${this.pad(this.clock.now())} ${message}`;
	}

	private pad(at: Date): string {
		return at.toISOString().padStart(24, "0");
	}
}
