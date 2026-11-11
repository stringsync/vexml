import { constants } from "node:os";
import { Output } from "./output";
import type { Child } from "./ps";

/**
 * A {@link Child} a test plays: it reads what was written to its stdin from
 * `received`, writes with `print`, and ends with `exit`.
 */
export class FakeChild implements Child {
	readonly stdin: WritableStream<Uint8Array>;
	readonly stdout: ReadableStream<Uint8Array>;
	readonly stderr: ReadableStream<Uint8Array>;
	readonly exited: Promise<number>;
	/** What was written to `stdin`, as the child would read it. */
	readonly received: ReadableStream<Uint8Array>;
	/** The signals it was sent while it ran, in order. */
	readonly signals: NodeJS.Signals[] = [];
	private readonly out: Output;
	private readonly err: Output;
	private settle: (code: number) => void = () => {};
	private done = false;

	constructor(readonly pid: number | null = null) {
		const pipe = new TransformStream<Uint8Array, Uint8Array>();
		this.stdin = pipe.writable;
		this.received = pipe.readable;
		this.out = new Output();
		this.err = new Output();
		this.stdout = this.out.stream;
		this.stderr = this.err.stream;
		this.exited = new Promise((resolve) => {
			this.settle = resolve;
		});
	}

	/** Writes `data` to its stdout. */
	print(data: string | Uint8Array): void {
		this.out.push(data);
	}

	/** Writes `data` to its stderr. */
	printError(data: string | Uint8Array): void {
		this.err.push(data);
	}

	/** Ends it with `code`, closing its output, as a child exiting does. */
	exit(code: number): void {
		if (this.done) {
			return;
		}
		this.done = true;
		this.out.close();
		this.err.close();
		this.settle(code);
	}

	/** Records `signal` and dies of it, as a child that does not catch it. */
	kill(signal: NodeJS.Signals = "SIGTERM"): void {
		if (!this.done) {
			this.signals.push(signal);
			this.exit(128 + (constants.signals[signal] ?? 0));
		}
	}
}
