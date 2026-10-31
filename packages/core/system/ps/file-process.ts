import {
	closeSync,
	constants,
	mkdtempSync,
	openSync,
	readSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Child, OutputWatcher, SpawnCaptureResult } from "./ps";
import { exitOf, reap } from "./reap";

interface FileOptions {
	cwd?: string;
	env: NodeJS.ProcessEnv;
	timeout?: number;
	signal?: AbortSignal;
}

/** Only the Bun process operations the FIFO-backed path needs. */
export interface FileProcess {
	pid: number;
	exitCode: number | null;
	signalCode: number | NodeJS.Signals | null;
	exited: Promise<number>;
	stdin: Pick<Bun.FileSink, "write" | "flush" | "end"> | number | undefined;
	kill(signal?: NodeJS.Signals): void;
	unref(): void;
}

/** The runtime boundary, also used to reproduce a lost exit without a race. */
export interface FileRuntime {
	spawn(
		argv: string[],
		opts: FileOptions & {
			stdin: "pipe" | "inherit";
			stdout: number;
			stderr: number;
		},
	): FileProcess;
	reap(pid: number): number | null;
}

/** Makes a FIFO at a path; null where `fileStart` is not used. */
const mkfifo: ((path: string) => void) | null =
	reap === null ? null : await load();

async function load(): Promise<(path: string) => void> {
	const { dlopen, FFIType } = await import("bun:ffi");
	const { symbols } = dlopen("libc.dylib", {
		mkfifo: { args: [FFIType.cstring, FFIType.u16], returns: FFIType.i32 },
	});
	return (path) => {
		if (symbols.mkfifo(Buffer.from(`${path}\0`), 0o600) !== 0) {
			throw new Error(`cannot make a FIFO at ${path}`);
		}
	};
}

const runtime: FileRuntime = {
	spawn: (argv, opts) => Bun.spawn(argv, opts),
	reap: (pid) => reap?.(pid) ?? null,
};

/** Starts a child with live output streams that survive a lost Bun exit. */
export function fileStart(
	argv: string[],
	opts: FileOptions & { stdin?: "pipe" | "inherit"; runtime?: FileRuntime },
): Child {
	// Bun can lose both an exit and its pipe events. Its output goes to FIFOs
	// read here, by polling rather than on Bun's events, so none of it is lost,
	// and a child whose reader has stopped blocks once its FIFO fills.
	const { stdin = "pipe", runtime: rt = runtime, ...spawnOptions } = opts;
	opts.signal?.throwIfAborted();
	const dir = mkdtempSync(join(tmpdir(), "webappwiz-ps-"));
	let out: FifoOutput | undefined;
	let err: FifoOutput | undefined;
	const writers: number[] = [];
	let child: FileProcess;
	try {
		out = new FifoOutput(join(dir, "stdout"));
		err = new FifoOutput(join(dir, "stderr"));
		// Each FIFO already has its reader, so opening it to write returns at once.
		const stdout = openSync(out.path, constants.O_WRONLY);
		writers.push(stdout);
		const stderr = openSync(err.path, constants.O_WRONLY);
		writers.push(stderr);
		child = rt.spawn(argv, { ...spawnOptions, stdin, stdout, stderr });
	} catch (error) {
		out?.[Symbol.dispose]();
		err?.[Symbol.dispose]();
		// One that cannot start, its program or cwd missing, ends as the pipe
		// path's does: streams that error and an exit that rejects with why.
		return unstarted(error);
	} finally {
		// The child holds its own copies: ours would keep the FIFOs from ending.
		for (const fd of writers) {
			closeSync(fd);
		}
		rmSync(dir, { recursive: true, force: true });
	}
	return follow(child, out, err, opts.signal, rt);
}

function unstarted(error: unknown): Child {
	const failed = (): ReadableStream<Uint8Array> =>
		new ReadableStream({ start: (controller) => controller.error(error) });
	return {
		pid: null,
		stdin: new WritableStream(),
		stdout: failed(),
		stderr: failed(),
		exited: Promise.reject(error),
		kill: () => {},
	};
}

function follow(
	child: FileProcess,
	out: FifoOutput,
	err: FifoOutput,
	signal: AbortSignal | undefined,
	rt: FileRuntime,
): Child {
	let gone = false;
	let readError: unknown;
	let poll: ReturnType<typeof setTimeout> | undefined;
	const read = (): void => {
		try {
			// Read on at once while output flows, and check back otherwise.
			const flowing = [out.drain(false), err.drain(false)].includes(true);
			poll = flowing ? setTimeout(read, 0) : setTimeout(read, 20);
		} catch (error) {
			readError = error;
			child.kill();
		}
	};
	read();
	const exited = (async () => {
		try {
			const code = await exitOf(child, rt);
			gone = true;
			clearTimeout(poll);
			if (readError !== undefined) {
				throw readError;
			}
			out.finish();
			err.finish();
			// Bun kills on abort but resolves `exited`; Ps promises rejection.
			signal?.throwIfAborted();
			return code;
		} catch (error) {
			out.fail(error);
			err.fail(error);
			throw error;
		} finally {
			gone = true;
			clearTimeout(poll);
			// A lost exit leaves Bun's handle referenced even after waitpid.
			child.unref();
			out[Symbol.dispose]();
			err[Symbol.dispose]();
		}
	})();
	const input = child.stdin;
	const stopped = exited.then(() => undefined);
	// A lost exit may strand a pending stdin flush as well as output pipes.
	// The caller must be free to finish once our own exit is known.
	const closeInput = async (): Promise<void> => {
		if (typeof input === "object") {
			try {
				await Promise.race([input.end(), stopped]);
			} catch (error) {
				ignoreClosedInput(error);
			}
		}
	};
	// Nobody need write stdin: do not leave an unobserved rejection on abort.
	void stopped.catch(() => {});
	return {
		pid: child.pid,
		stdin: new WritableStream<Uint8Array>({
			async write(bytes) {
				if (gone || typeof input !== "object") {
					return;
				}
				try {
					input.write(bytes);
					await Promise.race([input.flush(), stopped]);
				} catch (error) {
					ignoreClosedInput(error);
				}
			},
			close: closeInput,
			abort: closeInput,
		}),
		stdout: out.stream,
		stderr: err.stream,
		exited,
		kill: (signal = "SIGTERM") => {
			if (!gone && child.exitCode === null && child.signalCode === null) {
				child.kill(signal);
			}
		},
	};
}

/** Capture waits for both readers, including their final decoder flush. */
export async function fileCapture(
	argv: string[],
	opts: FileOptions & {
		input?: string;
		watcher?: OutputWatcher;
		runtime?: FileRuntime;
	},
): Promise<SpawnCaptureResult> {
	const { input, watcher, ...startOptions } = opts;
	const child = fileStart(argv, {
		...startOptions,
		stdin: input === undefined ? "inherit" : "pipe",
	});
	const feed = async (): Promise<void> => {
		if (input !== undefined) {
			const writer = child.stdin.getWriter();
			try {
				await writer.write(new TextEncoder().encode(input));
				await writer.close();
			} finally {
				writer.releaseLock();
			}
		}
	};
	const [exitCode, stdout, stderr] = await Promise.all([
		child.exited,
		text(child.stdout, { watcher, channel: "stdout" }),
		text(child.stderr, { watcher, channel: "stderr" }),
		feed(),
	]);
	return { exitCode, stdout, stderr };
}

async function text(
	stream: ReadableStream<Uint8Array>,
	opts: TextOptions,
): Promise<string> {
	const decoder = new TextDecoder();
	let result = "";
	for await (const bytes of stream) {
		const chunk = decoder.decode(bytes, { stream: true });
		result += chunk;
		opts.watcher?.[opts.channel](chunk);
	}
	const tail = decoder.decode();
	if (tail !== "") {
		result += tail;
		opts.watcher?.[opts.channel](tail);
	}
	return result;
}

interface TextOptions {
	watcher?: OutputWatcher;
	channel: "stdout" | "stderr";
}

/** Closing input after a child exits is normal, not a failed command. */
export function ignoreClosedInput(error: unknown): void {
	const code = (error as NodeJS.ErrnoException).code;
	if (
		code !== "EPIPE" &&
		code !== "ERR_STREAM_DESTROYED" &&
		code !== "ERR_STREAM_PREMATURE_CLOSE"
	) {
		throw error;
	}
}

/**
 * How much of an exited child's output to take without a reader. The child's
 * own is at most what its FIFO holds; only a descendant still writing has more.
 */
const LEFT_OVER = 1024 * 1024;

/** One output stream, read from a FIFO the child writes. */
class FifoOutput implements Disposable {
	readonly stream: ReadableStream<Uint8Array>;
	private readonly fd: number;
	private readonly buffer = Buffer.allocUnsafe(64 * 1024);
	private controller!: ReadableStreamDefaultController<Uint8Array>;
	private closed = false;
	private disposed = false;

	constructor(readonly path: string) {
		if (mkfifo === null) {
			throw new Error("FIFO-backed processes need Bun on macOS");
		}
		mkfifo(path);
		// Without blocking: there is no writer yet, and once there is, a read
		// with nothing to read must return rather than wait.
		this.fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
		this.stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				this.controller = controller;
			},
			cancel: () => {
				// A reader that leaves must not stall the child on a full FIFO.
				this.closed = true;
				this[Symbol.dispose]();
			},
		});
	}

	/** Reads what the reader has room for, or all there is when `final`. */
	drain(final: boolean): boolean {
		let read = false;
		let taken = 0;
		while (
			!this.closed &&
			(final ? taken < LEFT_OVER : (this.controller.desiredSize ?? 0) > 0)
		) {
			const count = this.next();
			if (count === null) {
				break;
			}
			if (count === 0) {
				this.end();
				this[Symbol.dispose]();
				break;
			}
			read = true;
			taken += count;
			this.controller.enqueue(Uint8Array.from(this.buffer.subarray(0, count)));
		}
		return read;
	}

	/** Takes what is left once the child is gone, and ends the stream. */
	finish(): void {
		this.drain(true);
		this.end();
	}

	fail(error: unknown): void {
		if (!this.closed) {
			this.closed = true;
			this.controller.error(error);
		}
	}

	[Symbol.dispose](): void {
		if (!this.disposed) {
			this.disposed = true;
			closeSync(this.fd);
		}
	}

	private end(): void {
		if (!this.closed) {
			this.closed = true;
			this.controller.close();
		}
	}

	/** Bytes read into the buffer: 0 at the end, null for none yet. */
	private next(): number | null {
		try {
			return readSync(this.fd, this.buffer, 0, this.buffer.length, null);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "EAGAIN") {
				return null;
			}
			throw error;
		}
	}
}
