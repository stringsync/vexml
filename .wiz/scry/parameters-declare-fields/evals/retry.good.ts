export class Retry {
	private readonly attempts: number;

	constructor(attempts?: number) {
		this.attempts = attempts ?? 3;
	}
}
