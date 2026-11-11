import { constants } from "node:os";
import { Output } from "./output";
import type { TerminalChild } from "./ps";

/**
 * A {@link TerminalChild} a test plays: `typed` is what was written at it,
 * `size` its last size, and `print` writes to its terminal.
 */
export class FakeTerminalChild implements TerminalChild {
	readonly output: ReadableStream<Uint8Array>;
	readonly exited: Promise<number>;
	/** Everything written at it, in order, as text. */
	readonly typed: string[] = [];
	/** The signals it was sent while it ran, in order. */
	readonly signals: NodeJS.Signals[] = [];
	size: { cols: number; rows: number };
	closed = false;
	private readonly out = new Output();
	private settle: (code: number) => void = () => {};
	private done = false;

	constructor(
		cols: number,
		rows: number,
		readonly pid = 0,
	) {
		this.size = { cols, rows };
		this.output = this.out.stream;
		this.exited = new Promise((resolve) => {
			this.settle = resolve;
		});
	}

	write(data: string | Uint8Array): void {
		if (!this.closed) {
			this.typed.push(
				typeof data === "string" ? data : new TextDecoder().decode(data),
			);
		}
	}

	resize(cols: number, rows: number): void {
		if (!this.closed) {
			this.size = { cols, rows };
		}
	}

	close(): void {
		this.closed = true;
		this.out.close();
	}

	/** Writes `data` to its terminal. */
	print(data: string | Uint8Array): void {
		if (!this.closed) {
			this.out.push(data);
		}
	}

	/** Ends it with `code`. */
	exit(code: number): void {
		if (!this.done) {
			this.done = true;
			this.settle(code);
		}
	}

	/** Records `signal` and dies of it, as a child that does not catch it. */
	kill(signal: NodeJS.Signals = "SIGTERM"): void {
		if (!this.done) {
			this.signals.push(signal);
			this.exit(128 + (constants.signals[signal] ?? 0));
		}
	}
}
