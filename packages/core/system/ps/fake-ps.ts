import { disposables, type Resource } from "core/disposable";
import { FakeChild, FakeTerminalChild } from "./fake-child";
import type {
	ListeningEntry,
	ProcessEntry,
	Ps,
	SpawnCaptureResult,
	SpawnOptions,
	SpawnResult,
	StartOptions,
	TerminalOptions,
} from "./ps";

export class FakePs implements Ps {
	platform: NodeJS.Platform = "darwin";
	pid = 4242;
	hostname = "fake-host";
	args: string[] = [];
	self: string[] = ["bun", "/fake/entry.ts"];

	private dead = new Set<number>();
	private path = "/";
	private vars: Record<string, string> = {};
	private width: number | undefined;
	private calls: string[] = [];
	private dirs: string[] = [];
	private envs: Record<string, string>[] = [];
	private handlers = new Map<string, Array<() => void>>();
	private exitCode = 0;
	private exited = false;
	private captureOutput = { stdout: "", stderr: "" };
	private simulation = () => Promise.resolve(0);
	private children: FakeChild[] = [];
	private terminals: FakeTerminalChild[] = [];
	private table: ProcessEntry[] = [];
	private listeners: ListeningEntry[] = [];
	/** The pid the next child started gets. */
	private nextPid = 5000;

	alive(pid: number): boolean {
		return !this.dead.has(pid);
	}

	/** Marks a pid dead, so `alive` reports false for it. */
	kill(pid: number): void {
		this.dead.add(pid);
	}

	async spawn(argv: string[], opts?: SpawnOptions): Promise<SpawnResult> {
		return { exitCode: await this.run(argv, opts) };
	}

	async spawnCapture(
		argv: string[],
		opts?: SpawnOptions,
	): Promise<SpawnCaptureResult> {
		const exitCode = await this.run(argv, opts);
		const { stdout, stderr } = this.captureOutput;
		// all at once, as if it came in one chunk
		if (stdout !== "") {
			opts?.watcher?.stdout(stdout);
		}
		if (stderr !== "") {
			opts?.watcher?.stderr(stderr);
		}
		return { exitCode, stdout, stderr };
	}

	/** A child for the test to play, found again in `getChildren()`. */
	start(argv: string[], opts?: StartOptions): FakeChild {
		this.record(argv, opts);
		const child = new FakeChild(this.nextPid++);
		this.children.push(child);
		return child;
	}

	/** A terminal child for the test to play, found in `getTerminals()`. */
	startOnTerminal(argv: string[], opts: TerminalOptions): FakeTerminalChild {
		this.record(argv, opts);
		const child = new FakeTerminalChild(opts.cols, opts.rows, this.nextPid++);
		this.terminals.push(child);
		return child;
	}

	async processes(): Promise<ProcessEntry[]> {
		return this.table;
	}

	async listening(): Promise<ListeningEntry[]> {
		return this.listeners;
	}

	/** What `listening` lists from now on. */
	setListening(listeners: ListeningEntry[]): void {
		this.listeners = listeners;
	}

	/** What `processes` lists from now on. */
	setProcesses(table: ProcessEntry[]): void {
		this.table = table;
	}

	cwd(): string {
		return this.path;
	}

	env(name: string): string | undefined {
		return this.vars[name];
	}

	columns(): number | undefined {
		return this.width;
	}

	cd(path: string): void {
		if (!this.exited) {
			this.path = path;
		}
	}

	/** Runs the "exit" handlers on the way out, as a real process does. */
	exit(code: number): void {
		if (this.exited) {
			return;
		}
		this.exitCode = code;
		const handlers = this.handlers.get("exit") ?? [];
		this.handlers.delete("exit");
		for (const handler of handlers) {
			handler();
		}
		this.exited = true;
	}

	on(signal: string, handler: () => void): Resource {
		const handlers = this.handlers.get(signal) ?? [];
		handlers.push(handler);
		this.handlers.set(signal, handlers);
		return disposables.callback(() => this.off(signal, handler));
	}

	once(event: "exit", handler: () => void): Resource {
		const wrapped = () => {
			handler();
			this.off(event, wrapped);
		};
		return this.on(event, wrapped);
	}

	// scry-ignore objects-over-callbacks: a test knob on a fake, where what a spawn does is one expression, so an interface would only ask every test to wrap that expression in an object literal
	simulate(simulation: () => Promise<number>): void {
		this.simulation = simulation;
	}

	setCaptureOutput(stdout: string, stderr: string): void {
		this.captureOutput = { stdout, stderr };
	}

	/** Makes stdout a terminal this many columns wide; undefined, a pipe again. */
	setColumns(width: number | undefined): void {
		this.width = width;
	}

	setEnv(vars: Record<string, string>): void {
		this.vars = { ...this.vars, ...vars };
	}

	/** The fake starts at `/` unless a test says otherwise. */
	setCwd(path: string): void {
		this.path = path;
	}

	getCalls(): string[] {
		return this.calls;
	}

	/** What `start` started, in order. */
	getChildren(): FakeChild[] {
		return this.children;
	}

	/** What `startOnTerminal` started, in order. */
	getTerminals(): FakeTerminalChild[] {
		return this.terminals;
	}

	/** Positionally matched to `getCalls()`. */
	getCallDirs(): string[] {
		return this.dirs;
	}

	/** What each call added to the environment, positionally matched to `getCalls()`. */
	getCallEnvs(): Record<string, string>[] {
		return this.envs;
	}

	getExitCode(): number {
		return this.exitCode;
	}

	dispatch(signal: string): void {
		if (!this.exited) {
			for (const handler of [...(this.handlers.get(signal) ?? [])]) {
				handler();
			}
		}
	}

	isExited(): boolean {
		return this.exited;
	}

	private off(signal: string, handler: () => void): void {
		const handlers = this.handlers.get(signal) ?? [];
		const index = handlers.indexOf(handler);
		if (index !== -1) {
			handlers.splice(index, 1);
		}
	}

	/**
	 * What a spawn answers with: whatever the simulation returns, or the
	 * process's own code once it has exited, since nothing runs after that.
	 */
	private async run(argv: string[], opts?: SpawnOptions): Promise<number> {
		if (this.exited) {
			return this.exitCode;
		}
		this.record(argv, opts);
		return this.simulation();
	}

	private record(argv: string[], opts?: StartOptions): void {
		this.calls.push(argv.join(" "));
		this.dirs.push(opts?.cwd ?? this.path);
		this.envs.push(opts?.env ?? {});
	}
}
