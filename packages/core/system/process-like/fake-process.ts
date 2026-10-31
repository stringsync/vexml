import type { ProcessLike } from "./process-like";

/**
 * A `process` for tests that need `NodePs` to really spawn (real git, real
 * exit codes) but must not really exit. `exit` and `chdir` are recorded
 * instead of taken, and signal handlers are dispatched by hand rather than by
 * the OS, so nothing leaks into the test runner.
 */
export class FakeProcess implements ProcessLike {
	platform: NodeJS.Platform = process.platform;
	pid = process.pid;
	// the runtime and entry point a real argv leads with, then nothing: a test
	// that wants arguments assigns them
	argv: string[] = process.argv.slice(0, 2);
	env: NodeJS.ProcessEnv = process.env;
	readonly exits: number[] = [];

	private path = process.cwd();
	private readonly dead = new Set<number>();
	private readonly handlers = new Map<
		string,
		Array<(...args: unknown[]) => void>
	>();

	/** Real existence checks, so a pid the test did not invent answers honestly. */
	kill(pid: number, signal: 0): boolean {
		if (this.dead.has(pid)) {
			const error: NodeJS.ErrnoException = new Error(`kill ESRCH ${pid}`);
			error.code = "ESRCH";
			throw error;
		}
		return process.kill(pid, signal);
	}

	/** Reports a pid as gone whatever the OS thinks. */
	markDead(pid: number): void {
		this.dead.add(pid);
	}

	cwd(): string {
		return this.path;
	}

	chdir(path: string): void {
		this.path = path;
	}

	exit(code: number): void {
		this.exits.push(code);
	}

	lastExit(): number | undefined {
		return this.exits.at(-1);
	}

	on(event: string, handler: (...args: unknown[]) => void): void {
		this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
	}

	once(event: string, handler: () => void): void {
		this.on(event, handler);
	}

	off(event: string, handler: (...args: unknown[]) => void): void {
		this.handlers.set(
			event,
			(this.handlers.get(event) ?? []).filter((held) => held !== handler),
		);
	}

	/** Stands in for the OS, which never delivers anything to a fake. */
	dispatch(event: string): void {
		for (const handler of this.handlers.get(event) ?? []) {
			handler();
		}
	}
}
