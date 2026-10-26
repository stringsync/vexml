import type { JevClient, JevRequest } from './jev-client';

/** Records requests and answers each with the next supplied set of probabilities. */
export class FakeJev implements JevClient {
	readonly requests: JevRequest[] = [];
	constructor(
		private readonly answers: Record<string, number>[] = [],
		private readonly enabled = true,
	) {}
	async available(): Promise<boolean> {
		return this.enabled;
	}
	async ask(request: JevRequest): Promise<Record<string, number>> {
		this.requests.push(request);
		const next = this.answers[this.requests.length - 1];
		return Object.fromEntries(
			Object.keys(request.questions).map((id) => [id, next?.[id] ?? 0.99]),
		);
	}
}
