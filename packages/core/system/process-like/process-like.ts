/**
 * The parts of `process` that NodePs touches. Hand NodePs a `FakeProcess` to
 * test with real subprocesses and exit codes, while `exit` kills nothing and
 * signal handlers stay with the test that set them.
 */
export interface ProcessLike {
	platform: NodeJS.Platform;
	pid: number;
	argv: string[];
	env: NodeJS.ProcessEnv;
	/** `columns` is set only while stdout is a terminal. */
	stdout?: { columns?: number };
	kill(pid: number, signal: 0): boolean;
	cwd(): string;
	chdir(path: string): void;
	exit(code: number): void;
	on(event: string, handler: (...args: unknown[]) => void): void;
	once(event: string, handler: () => void): void;
	off(event: string, handler: (...args: unknown[]) => void): void;
}
