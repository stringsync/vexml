import { join } from "node:path";
import { ConsoleLogger, type Logger } from "core/log";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";
import type { Timer, WallClock } from "core/time";
import { CliGit } from "./git/cli-git";
import type { Git } from "./git/git";
import type { PlannedStep } from "./release-options";
import { ShipAnswers } from "./ship-answers";
import type { Step } from "./step";
import {
	type SignInAsk,
	type StepDeclaration,
	StepEvents,
} from "./step-events";
import { StepRunner } from "./step-runner";

/** A deployment has a commit, with no package roster or release version. */
export interface DeployContext {
	readonly commit: string;
	readonly root: string;
	readonly dryRun: boolean;
	readonly log: Logger;
	/** Absent when nothing can ask the user, as outside the Ships page. */
	readonly askSignIn?: SignInAsk;
}

export interface DeployOptions {
	root?: string;
	/** Override the private git directory, useful with an injected Git. */
	stateDir?: string;
	git?: Git;
	fs?: Fs;
	ps?: Ps;
	log?: Logger;
	timer?: Timer;
	wallClock?: WallClock;
	dryRun?: boolean;
	yes?: boolean;
	// vet-ignore objects-over-callbacks: uses the platform prompt dependency
	prompt?: (message: string) => string | null;
}

/** An artifact reports the commit it actually runs, independently of resume state. */
export interface DeployArtifact {
	readonly name: string;
	deployed(): Promise<string | undefined>;
}

export interface DeployPlan {
	schema: 1;
	/** Repository-relative literal source files or directories; empty means undeclared. */
	paths?: readonly string[];
	identity: { kind: "commit"; commit: string };
	resuming: boolean;
	steps: PlannedStep[];
}

interface DeployState {
	commit: string;
	done: string[];
}

/** Declared steps in caller order, resumable per target and checked-out commit. */
export class Deploy {
	readonly paths: readonly string[];
	constructor(
		readonly name: string,
		readonly steps: readonly Step<DeployContext>[],
		readonly artifacts: readonly DeployArtifact[] = [],
		paths: readonly string[] = [],
	) {
		this.paths = Object.freeze([...new Set(paths.map(sourcePath))]);
		if (!name.trim()) {
			throw new Error("deploy requires a target name");
		}
	}

	private declarations(): StepDeclaration<DeployContext>[] {
		const counts = new Map<string, number>();
		return this.steps.map((step) => {
			const count = (counts.get(step.name) ?? 0) + 1;
			counts.set(step.name, count);
			return { id: `step:${this.name}:${step.name}#${count}`, step };
		});
	}

	private async at(opts: DeployOptions) {
		const ps = opts.ps ?? new NodePs();
		const fs = opts.fs ?? new NodeFs();
		const root = opts.root ?? ps.cwd();
		const git = opts.git ?? new CliGit(root, { ps });
		const commit = await git.head();
		// Git's private directory is ignored by clean(), and shared by no target.
		const result =
			opts.stateDir === undefined
				? await ps.spawnCapture([
						"git",
						"-C",
						root,
						"rev-parse",
						"--absolute-git-dir",
					])
				: undefined;
		if (result && result.exitCode !== 0) {
			throw new Error(result.stderr);
		}
		const directory = opts.stateDir ?? result?.stdout.trim();
		if (!directory) {
			throw new Error("cannot locate deploy state directory");
		}
		const path = join(
			directory,
			`DEPLOY.${encodeURIComponent(this.name)}.${encodeURIComponent(commit)}`,
		);
		return { ps, fs, root, git, commit, path };
	}

	private async read(
		fs: Fs,
		path: string,
		commit: string,
	): Promise<DeployState | null> {
		if (!(await fs.exists(path))) {
			return null;
		}
		const state = JSON.parse(await fs.read(path));
		if (
			state?.commit !== commit ||
			!Array.isArray(state.done) ||
			!state.done.every((id: unknown) => typeof id === "string")
		) {
			throw new Error(`invalid deploy state: ${path}`);
		}
		return state;
	}

	async plan(opts: DeployOptions = {}): Promise<DeployPlan> {
		const at = await this.at(opts);
		return {
			schema: 1,
			paths: [...this.paths],
			identity: { kind: "commit", commit: at.commit },
			resuming: (await this.read(at.fs, at.path, at.commit)) !== null,
			steps: this.declarations().map(({ id, step }) => ({
				id,
				name: step.name,
				stage: step.stage ?? "publish",
				packages: [],
				deadlineMs: step.deadline.ms,
			})),
		};
	}

	async status(opts: DeployOptions = {}) {
		const at = await this.at(opts);
		return {
			identity: { kind: "commit" as const, commit: at.commit },
			artifacts: await Promise.all(
				this.artifacts.map(async (artifact) => ({
					name: artifact.name,
					deployed: (await artifact.deployed()) ?? null,
				})),
			),
		};
	}

	async deploy(opts: DeployOptions = {}): Promise<void> {
		const at = await this.at(opts);
		if (!(await at.git.clean())) {
			throw new Error("uncommitted changes: deploy requires a clean tree");
		}
		const context: DeployContext = {
			commit: at.commit,
			root: at.root,
			dryRun: opts.dryRun === true,
			log: opts.log ?? new ConsoleLogger(),
		};
		const events = new StepEvents(
			at.ps.env("SPLATES_SHIP_EVENTS"),
			at.fs,
			opts.wallClock,
		);
		const answerPath = at.ps.env("SPLATES_SHIP_ANSWERS");
		const answers =
			answerPath && at.ps.env("SPLATES_SHIP_EVENTS")
				? new ShipAnswers(answerPath, at.fs, events, opts.timer)
				: undefined;
		const runner = new StepRunner(events, opts.timer);
		const declarations = this.declarations();
		await runner.declare(declarations);
		const state = context.dryRun
			? { commit: at.commit, done: [] }
			: ((await this.read(at.fs, at.path, at.commit)) ?? {
					commit: at.commit,
					done: [],
				});
		if (!context.dryRun) {
			await at.fs.write(at.path, JSON.stringify(state));
		}
		for (const declaration of declarations) {
			const { step } = declaration;
			if (context.dryRun) {
				if (step.dryRun) {
					await runner.run(
						{
							...declaration,
							step: { ...step, run: step.dryRun, check: undefined },
						},
						context,
					);
				} else {
					context.log.info(`would run ${step.name}`);
				}
				continue;
			}
			const done = state.done.includes(declaration.id);
			if (!done && step.confirm !== undefined) {
				const go = answers
					? await answers.ask(
							declaration.id,
							step.name,
							`${step.confirm} (y/n)`,
						)
					: opts.yes === true ||
						(opts.prompt ?? prompt)(`${step.confirm} (y/n)`)
							?.trim()
							.toLowerCase() === "y";
				if (!go) {
					return;
				}
			}
			await runner.run(
				declaration,
				answers === undefined
					? context
					: {
							...context,
							askSignIn: (question, signIn, signal) =>
								answers.ask(declaration.id, step.name, question, {
									signIn,
									signal,
								}),
						},
				{ done },
			);
			if (!done) {
				state.done.push(declaration.id);
			}
			await at.fs.write(at.path, JSON.stringify(state));
		}
		if (!context.dryRun) {
			await at.fs.rm(at.path, { force: true });
		}
	}
}

/** Declare a commit-keyed deployment beside versioned releases. */
export function deploy(
	name: string,
	steps: readonly Step<DeployContext>[],
	artifacts: readonly DeployArtifact[] = [],
	paths: readonly string[] = [],
): Deploy {
	return new Deploy(name, steps, artifacts, paths);
}

/** Keep paths portable and literal so consumers can safely pass them to git. */
function sourcePath(path: string): string {
	if (
		!path ||
		path !== path.trim() ||
		path.startsWith("/") ||
		[...path].some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		) ||
		/[:\\*?[\]{}]/.test(path) ||
		path.split("/").some((part) => !part || part === "." || part === "..")
	) {
		throw new Error(`invalid deploy source path: ${JSON.stringify(path)}`);
	}
	return path;
}
