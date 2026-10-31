import { type ChildProcess, spawn } from "node:child_process";
import { readlink } from "node:fs/promises";
import { hostname } from "node:os";
import { Readable, Writable } from "node:stream";
import { disposables, type Resource } from "core/disposable";
import type { ProcessLike } from "../process-like/process-like";
import { fileCapture, fileStart, ignoreClosedInput } from "./file-process";
import { type Listener, parseLsof, parseLsofCwds, parseSs } from "./listening";
import type {
	Child,
	ListeningEntry,
	ProcessEntry,
	Ps,
	SpawnCaptureResult,
	SpawnOptions,
	SpawnResult,
	StartOptions,
	TerminalChild,
	TerminalOptions,
} from "./ps";
import { exitOf, reap, shellCode } from "./reap";

/** What a `NodePs` speaks to; the running process by default. */
export interface NodePsOptions {
	proc?: ProcessLike;
}

export class NodePs implements Ps {
	platform: NodeJS.Platform;
	pid: number;
	hostname = hostname();
	args: string[];
	self: string[];
	private readonly proc: ProcessLike;

	constructor(opts: NodePsOptions = {}) {
		this.proc = opts.proc ?? process;
		this.platform = this.proc.platform;
		this.pid = this.proc.pid;
		// argv[0] is the runtime and argv[1] the entry point; a cli parses neither
		this.args = this.proc.argv.slice(2);
		this.self = this.proc.argv.slice(0, 2);
	}

	alive(pid: number): boolean {
		try {
			this.proc.kill(pid, 0); // signal 0 checks for existence without delivering
			return true;
		} catch (e) {
			// EPERM means it exists but belongs to another user.
			return (e as NodeJS.ErrnoException).code === "EPERM";
		}
	}

	async spawn(argv: string[], opts?: SpawnOptions): Promise<SpawnResult> {
		const [cmd, args] = parse(argv);
		if (reap !== null) {
			opts?.signal?.throwIfAborted();
			const child = Bun.spawn(argv, {
				...this.options(opts),
				stdio: ["inherit", "inherit", "inherit"],
			});
			try {
				const code = await exitOf(child, { reap });
				opts?.signal?.throwIfAborted();
				return { exitCode: code };
			} finally {
				child.unref();
			}
		}
		const child = spawn(cmd, args, {
			...this.options(opts),
			stdio: "inherit",
		});
		return { exitCode: await exitCode(child) };
	}

	async spawnCapture(
		argv: string[],
		opts?: SpawnOptions,
	): Promise<SpawnCaptureResult> {
		const [cmd, args] = parse(argv);
		if (reap !== null) {
			return fileCapture(argv, {
				...this.options(opts),
				input: opts?.stdin,
				watcher: opts?.watcher,
			});
		}
		const child = spawn(cmd, args, {
			...this.options(opts),
			stdio: [opts?.stdin === undefined ? "inherit" : "pipe", "pipe", "pipe"],
		});
		// a child that exits without reading all of it is not an error here
		child.stdin?.on("error", () => {});
		child.stdin?.end(opts?.stdin);

		// piped above, so both are there; the stdin choice widens the type
		if (child.stdout === null || child.stderr === null) {
			throw new Error("spawnCapture lost its output pipes");
		}
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
			stdout += chunk;
			opts?.watcher?.stdout(chunk);
		});
		child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
			stderr += chunk;
			opts?.watcher?.stderr(chunk);
		});

		return { exitCode: await exitCode(child), stdout, stderr };
	}

	start(argv: string[], opts?: StartOptions): Child {
		const [cmd, args] = parse(argv);
		if (reap !== null) {
			return fileStart(argv, this.options(opts));
		}
		const child = spawn(cmd, args, {
			...this.options(opts),
			stdio: "pipe",
		});
		// a child that exits before reading all of it is not an error here
		child.stdin.on("error", () => {});
		const exited = exitCode(child);
		return {
			pid: child.pid ?? null,
			stdin: forgivingInput(child.stdin),
			stdout: web(child.stdout),
			stderr: web(child.stderr),
			exited,
			kill: (signal = "SIGTERM") => {
				if (child.exitCode === null && child.signalCode === null) {
					child.kill(signal);
				}
			},
		};
	}

	startOnTerminal(argv: string[], opts: TerminalOptions): TerminalChild {
		parse(argv);
		if (!process.versions.bun || this.platform === "win32") {
			throw new Error("startOnTerminal needs Bun on a POSIX system");
		}
		let closed = false;
		let reader: ReadableStreamDefaultController<Uint8Array> | undefined;
		const output = new ReadableStream<Uint8Array>({
			start: (controller) => {
				reader = controller;
			},
		});
		const end = (): void => {
			if (!closed) {
				closed = true;
				reader?.close();
			}
		};
		const terminal = new Bun.Terminal({
			cols: opts.cols,
			rows: opts.rows,
			data: (_, bytes) => {
				if (!closed) {
					// copied, since the terminal reuses its buffer
					reader?.enqueue(bytes.slice());
				}
			},
			exit: end,
		});
		const { cwd, env, timeout, signal } = this.options(opts);
		// In a session of its own, so the terminal can be its controlling one:
		// see CLAIM.
		const child = Bun.spawn([process.execPath, "-e", CLAIM, "--", ...argv], {
			terminal,
			cwd,
			env,
			timeout,
			signal,
			detached: true,
		});
		const running = (): boolean =>
			child.exitCode === null && child.signalCode === null;
		return {
			// The wrapper execs the program, so its pid is the program's.
			pid: child.pid,
			output,
			write: (data) => {
				if (!terminal.closed) {
					terminal.write(data);
				}
			},
			resize: (cols, rows) => {
				if (!terminal.closed) {
					terminal.resize(cols, rows);
				}
			},
			// The exit code, not the terminal's own `exit`, which only says the
			// stream closed and on Linux may never fire at all (Bun issue 40289).
			exited: child.exited.then(() =>
				shellCode(child.exitCode, child.signalCode),
			),
			kill: (signal = "SIGTERM") => {
				if (running()) {
					child.kill(signal);
				}
			},
			close: () => {
				terminal.close();
				end();
			},
		};
	}

	async processes(): Promise<ProcessEntry[]> {
		if (this.platform === "win32") {
			return [];
		}
		const { stdout } = await this.spawnCapture(
			["ps", "-A", "-o", "pid=,ppid=,pgid=,tpgid=,command="],
			{ stdin: "" },
		);
		return stdout.split("\n").flatMap((line) => {
			const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(.*)$/.exec(line);
			return match === null
				? []
				: [
						{
							pid: Number(match[1]),
							ppid: Number(match[2]),
							pgid: Number(match[3]),
							tpgid: Number(match[4]),
							command: match[5] ?? "",
						},
					];
		});
	}

	async listening(): Promise<ListeningEntry[]> {
		if (this.platform === "win32") {
			return [];
		}
		// Exits 1 when nothing listens, which is no failure.
		const lsof = await this.spawnCapture(
			["lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"],
			{ stdin: "" },
		).catch(() => null);
		if (lsof !== null && lsof.exitCode <= 1) {
			const listeners = parseLsof(lsof.stdout);
			const pids = [...new Set(listeners.map((each) => each.pid))];
			const cwds =
				pids.length === 0
					? new Map<number, string>()
					: parseLsofCwds(
							(
								await this.spawnCapture(
									[
										"lsof",
										"-nP",
										"-a",
										"-d",
										"cwd",
										"-p",
										pids.join(","),
										"-Fpn",
									],
									{ stdin: "" },
								)
							).stdout,
						);
			return withCwds(listeners, (pid) => cwds.get(pid) ?? null);
		}
		// A slim Linux image may have no lsof, but iproute2's `ss` and /proc.
		if (this.platform === "linux") {
			const ss = await this.spawnCapture(["ss", "-Hltnp"], {
				stdin: "",
			}).catch(() => null);
			if (ss?.exitCode === 0) {
				const listeners = parseSs(ss.stdout);
				const cwds = new Map<number, string | null>();
				for (const { pid } of listeners) {
					cwds.set(pid, await readlink(`/proc/${pid}/cwd`).catch(() => null));
				}
				return withCwds(listeners, (pid) => cwds.get(pid) ?? null);
			}
		}
		return [];
	}

	/**
	 * Node replaces the whole environment when `env` is given, so a command
	 * launched with the caller's two or three variables would have no PATH and
	 * no HOME. Callers mean "and these as well", so that is what this does.
	 *
	 * Always built from `proc.env` rather than left undefined for Node to
	 * inherit, so what a child sees comes through the seam either way.
	 */
	private options(opts?: SpawnOptions): {
		cwd?: string;
		env: NodeJS.ProcessEnv;
		timeout?: number;
		signal?: AbortSignal;
	} {
		const env: NodeJS.ProcessEnv = { ...this.proc.env };
		for (const name of opts?.unset ?? []) {
			delete env[name];
		}
		return {
			cwd: opts?.cwd,
			env: { ...env, ...opts?.env },
			timeout: opts?.timeoutMs,
			signal: opts?.signal,
		};
	}

	cwd(): string {
		return this.proc.cwd();
	}

	env(name: string): string | undefined {
		return this.proc.env[name];
	}

	columns(): number | undefined {
		return this.proc.stdout?.columns;
	}

	cd(path: string): void {
		this.proc.chdir(path);
	}

	exit(code: number): void {
		this.proc.exit(code);
	}

	on(signal: string, handler: () => void): Resource {
		this.proc.on(signal, handler);
		return disposables.callback(() => this.proc.off(signal, handler));
	}

	once(event: "exit", handler: () => void): Resource {
		this.proc.once(event, handler);
		return disposables.callback(() => this.proc.off(event, handler));
	}
}

function parse(argv: string[]): [string, string[]] {
	const [cmd, ...args] = argv;
	if (!cmd) {
		throw new Error("spawn requires a command");
	}
	return [cmd, args];
}

/**
 * A child's output as a web stream. Node types its own web streams apart from
 * the global ones, though they are the same at runtime, and its pipes carry
 * bytes unless given an encoding, which these never are.
 */
function web(readable: Readable): ReadableStream<Uint8Array> {
	return Readable.toWeb(readable) as unknown as ReadableStream<Uint8Array>;
}

/** Keep an early stdin close from making a successful command reject. */
function forgivingInput(input: Writable): WritableStream<Uint8Array> {
	const writer = Writable.toWeb(input).getWriter();
	return new WritableStream<Uint8Array>({
		write: (bytes) => writer.write(bytes).catch(ignoreClosedInput),
		close: () => writer.close().catch(ignoreClosedInput),
		abort: (reason) => writer.abort(reason).catch(ignoreClosedInput),
	});
}

function exitCode(child: ChildProcess): Promise<number> {
	return new Promise((resolve, reject) => {
		// Only the ordinary pipe path uses this: wait for every pipe to close,
		// without a deadline that could return partial output.
		child.on("close", (code, signal) => resolve(shellCode(code, signal)));
		child.on("error", reject);
	});
}

/**
 * Run by `bun -e` as the terminal's child, ahead of the program it is handed:
 * makes the terminal its controlling one, then becomes that program. Without
 * it, ^C never interrupts the job in front and a resize never reaches
 * full-screen programs, since `Bun.Terminal` leaves the child with no
 * controlling terminal (Bun issue 33237). Drop it once Bun does this itself.
 */
const CLAIM = `
import { dlopen, FFIType, ptr } from "bun:ffi";
const darwin = process.platform === "darwin";
const libc = dlopen(darwin ? "libc.dylib" : "libc.so.6", {
	ioctl: { args: [FFIType.i32, FFIType.u64, FFIType.i32], returns: FFIType.i32 },
	execvp: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
});
const TIOCSCTTY = darwin ? 0x20007461 : 0x540e;
if (libc.symbols.ioctl(0, TIOCSCTTY, 0) !== 0) {
	console.error("^C and resizes will not reach programs in this terminal");
}
const argv = process.argv.slice(1);
const strings = argv.map((arg) => Buffer.from(arg + "\\0"));
const pointers = new BigUint64Array(argv.length + 1);
strings.forEach((each, i) => { pointers[i] = BigInt(ptr(each)); });
libc.symbols.execvp(ptr(strings[0]), ptr(pointers));
console.error("could not run " + argv[0]);
process.exit(127);
`;

function withCwds(
	listeners: Listener[],
	cwd: (pid: number) => string | null,
): ListeningEntry[] {
	return listeners.map((each) => ({ ...each, cwd: cwd(each.pid) }));
}
