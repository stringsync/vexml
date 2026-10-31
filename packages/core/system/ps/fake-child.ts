import { constants } from "node:os";
import type { Child, TerminalChild } from "./ps";

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

/** A stream a fake writes to: bytes in as they are pushed, closed once. */
class Output {
	readonly stream: ReadableStream<Uint8Array>;
	private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
	private closed = false;

	constructor() {
		this.stream = new ReadableStream({
			start: (controller) => {
				this.controller = controller;
			},
		});
	}

	push(data: string | Uint8Array): void {
		if (!this.closed) {
			this.controller?.enqueue(
				typeof data === "string" ? new TextEncoder().encode(data) : data,
			);
		}
	}

	close(): void {
		if (!this.closed) {
			this.closed = true;
			this.controller?.close();
		}
	}
}
