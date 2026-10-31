import { rm } from "node:fs/promises";
import { color } from "core/log";
import type { Fs, Ps } from "core/system";
import { Duration } from "core/time";
import { type Artifact, STAGES } from "./artifact/artifact";
import type { Exports, Manifest } from "./bundle/published";
import type { Cut } from "./cut";
import type { Git } from "./git/git";
import type { Step, StepStage } from "./step";
import type { StepDeclaration } from "./step-events";
import type { StepRunner } from "./step-runner";

/** A file Node can import, as an export or `main` names it. */
const SCRIPT = /\.[cm]?js$/;

/** An export of test helpers, such as `./testing` or `./agents/testing`. */
const TESTING = /(^|\/)testing$/;

/** A release's declared steps and what a dry run of them runs through. */
export interface RehearsalOptions {
	preflight: StepDeclaration;
	before: readonly StepDeclaration[];
	versionStep: StepDeclaration;
	going: readonly StepDeclaration[];
	artifacts: readonly Artifact[];
	/** The packages the release publishes. */
	packages: readonly string[];
	cut: Cut;
	runner: StepRunner;
	git: Git;
	fs: Fs;
	ps: Ps;
	/** Whether the dry run's directory is the run's own, to remove after. */
	owned: boolean;
}

/**
 * Runs a release's steps as a dry run takes them: each with a `dryRun` runs
 * that, one without runs as usual up to the build and is skipped after, and
 * the packs are installed right after they would have been published.
 * Whatever happens, the stamp is undone, the build cleaned and a directory
 * the run made for itself removed.
 */
export async function rehearse(opts: RehearsalOptions): Promise<void> {
	const { preflight, before, versionStep, going, cut, runner, git } = opts;
	const install: StepDeclaration = {
		id: "dry-run:install",
		step: installStep({ packages: opts.packages, fs: opts.fs, ps: opts.ps }),
	};
	const after = going.findIndex(
		({ step }) =>
			STAGES.indexOf(
				step.stage === "preflight" ? "publish" : (step.stage ?? "publish"),
			) > STAGES.indexOf("publish"),
	);
	const declared = [preflight, ...before, versionStep];
	const steps = [
		...declared,
		...(after === -1 ? going : going.slice(0, after)),
		install,
		...(after === -1 ? [] : going.slice(after)),
	];
	await runner.declare(steps);
	let stamped = false;
	try {
		for (const declaration of steps) {
			stamped ||= declaration === versionStep;
			await runner.run(rehearsed(declaration), cut);
		}
	} finally {
		for (const artifact of opts.artifacts) {
			await artifact.clean?.(cut);
		}
		if (stamped) {
			await git.discard();
		}
		if (opts.owned && cut.dryRun !== undefined) {
			await rm(cut.dryRun.dir, { recursive: true, force: true });
		}
	}
	cut.log.info(color.green(`rehearsed ${cut.version}: nothing went out`));
}

/** What `installStep` installs and imports through. */
export interface InstallStepOptions {
	/** The packages the release publishes, whose exports are imported. */
	packages: readonly string[];
	fs: Fs;
	ps: Ps;
}

/**
 * The step a dry run adds after packing: installs every pack in the dry run's
 * `packs` into a project of its own, outside the workspace, and imports each
 * export of the release's packages with Node, or with Bun when one of them
 * names Bun among its `engines`, so a dependency npm cannot
 * resolve or an import the build left pointing into the workspace fails here
 * rather than for the first person to install it. Packs another release left
 * in the same dry run install too, so a package depending on one going out
 * beside it gets that one.
 */
export function installStep(opts: InstallStepOptions): Step {
	return {
		name: "Install the packs",
		deadline: Duration.mins(5),
		stage: "approve",
		run: (cut) => install(cut, opts),
		dryRun: (cut) => install(cut, opts),
	};
}

async function install(cut: Cut, opts: InstallStepOptions): Promise<void> {
	const { fs, ps } = opts;
	if (cut.dryRun === undefined || opts.packages.length === 0) {
		return;
	}
	const packs = `${cut.dryRun.dir}/packs`;
	const tarballs = (await fs.readdir(packs))
		.filter((file) => file.endsWith(".tgz"))
		.map((file) => `${packs}/${file}`);
	if (tarballs.length === 0) {
		return;
	}
	const consumer = `${cut.dryRun.dir}/consumer`;
	await fs.rm(consumer, { recursive: true, force: true });
	await fs.mkdir(consumer);
	await fs.write(
		`${consumer}/package.json`,
		`${JSON.stringify({ name: "dry-run", private: true, type: "module" })}\n`,
	);
	await spawn(
		ps,
		[
			"npm",
			"install",
			"--no-audit",
			"--no-fund",
			"--no-package-lock",
			...tarballs,
		],
		consumer,
	);
	const specifiers: string[] = [];
	let runtime = "node";
	for (const name of opts.packages) {
		const dir = `${consumer}/node_modules/${name}`;
		const manifest: Manifest = JSON.parse(await fs.read(`${dir}/package.json`));
		specifiers.push(...importable(name, manifest));
		if (runsOnBun(manifest)) {
			runtime = "bun";
		}
		for (const bin of Object.values(bins(manifest))) {
			if (!(await fs.exists(`${dir}/${bin}`))) {
				throw new Error(`${name} names bin ${bin}, which it does not hold`);
			}
		}
	}
	await fs.write(
		`${consumer}/imports.mjs`,
		specifiers
			.map((specifier) => `await import(${JSON.stringify(specifier)});`)
			.join("\n"),
	);
	await spawn(ps, [runtime, "imports.mjs"], consumer);
	cut.log.info(
		`${opts.packages.join(" ")} ${color.green("installed")} from the packs, ${specifiers.length} imports resolving`,
	);
}

/**
 * Every specifier a consumer can import from `name`, as its manifest exports
 * them, but for a `testing` subpath: test helpers load only under a test
 * runner, whose hooks they register as they are imported.
 */
export function importable(name: string, manifest: Manifest): string[] {
	if (manifest.exports === undefined) {
		return manifest.main !== undefined && SCRIPT.test(manifest.main)
			? [name]
			: [];
	}
	if (typeof manifest.exports === "string") {
		return SCRIPT.test(manifest.exports) ? [name] : [];
	}
	return Object.entries(manifest.exports)
		.filter(
			([key, target]) =>
				key.startsWith(".") && !TESTING.test(key) && script(target),
		)
		.map(([key]) => (key === "." ? name : `${name}/${key.slice(2)}`));
}

/** Whether an export resolves to a script for Node, through its `default` or `import`. */
function script(target: Exports): boolean {
	if (typeof target === "string") {
		return SCRIPT.test(target);
	}
	const chosen = target.import ?? target.default;
	return chosen !== undefined && script(chosen);
}

/** Whether a package says it runs on Bun, whose `bun:` imports Node cannot load. */
function runsOnBun(manifest: Manifest): boolean {
	const engines = manifest.engines;
	return typeof engines === "object" && engines !== null && "bun" in engines;
}

function bins(manifest: Manifest): Record<string, string> {
	const { bin, name } = manifest;
	if (bin === undefined) {
		return {};
	}
	return typeof bin === "string" ? { [name ?? "bin"]: bin } : bin;
}

async function spawn(ps: Ps, argv: string[], cwd: string): Promise<void> {
	const { exitCode, stdout, stderr } = await ps.spawnCapture(argv, { cwd });
	if (exitCode !== 0) {
		const said = `${stdout}\n${stderr}`
			.trim()
			.split("\n")
			.slice(-20)
			.join("\n");
		throw new Error(`${argv.slice(0, 2).join(" ")} failed in ${cwd}:\n${said}`);
	}
}

/** The stages whose steps only work on this machine, which a dry run runs as declared. */
const LOCAL: readonly StepStage[] = ["preflight", "stamp", "build"];

/**
 * `declaration` as a dry run runs it: its own `dryRun` with no check after,
 * as declared up to the build, and skipped from the publish stage on when it
 * has no `dryRun`, so nothing goes out that nobody said could go out.
 */
export function rehearsed(declaration: StepDeclaration): StepDeclaration {
	const { step } = declaration;
	const name = step.name;
	if (step.dryRun !== undefined) {
		const dryRun = step.dryRun.bind(step);
		return {
			...declaration,
			step: { name, deadline: step.deadline, stage: step.stage, run: dryRun },
		};
	}
	if (LOCAL.includes(step.stage ?? "publish")) {
		return declaration;
	}
	return {
		...declaration,
		step: {
			name,
			deadline: step.deadline,
			stage: step.stage,
			run: async (cut) => {
				cut.log.info(color.yellow(`would run ${name}, which has no dry run`));
			},
		},
	};
}
