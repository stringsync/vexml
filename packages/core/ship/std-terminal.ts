import type { Terminal } from "./process-ctx";

/** The process's own terminal: prints to stdout, reads stdin, one question at a time. */
export class StdTerminal implements Terminal {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(private readonly out: { info(line: string): void }) {}

	print(line: string): void {
		this.out.info(line);
	}

	ask(question: string, signal?: AbortSignal): Promise<string> {
		const answer = this.queue.then(async () => {
			signal?.throwIfAborted();
			const readline = await import("node:readline/promises");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			try {
				return await rl.question(question, { signal });
			} finally {
				rl.close();
			}
		});
		this.queue = answer.catch(() => {});
		return answer;
	}
}
