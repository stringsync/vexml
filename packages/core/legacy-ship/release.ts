// vet-ignore-file compact-files: Release orchestrates one resumable lifecycle; artifact execution and confirmation live in separate modules.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsoleLogger, color } from "core/log";
import { NodeFs, NodePs } from "core/system";
import { Duration } from "core/time";
import { type Artifact, STAGES, type Stage } from "./artifact/artifact";
import { Cut } from "./cut";
import { rehearse } from "./dry-run";
import { CliGit } from "./git/cli-git";
import type { Git } from "./git/git";
import { order } from "./order";
import { Confirmation, type Next } from "./release-confirm";
import { ReleaseFile } from "./release-file";
import type {
	PlanOptions,
	PublishOptions,
	ReleaseOptions,
	ReleasePlan,
	ReleaseStatus,
	StatusOptions,
} from "./release-options";
import { ShipAnswers } from "./ship-answers";
import type { Step } from "./step";
import { type StepDeclaration, StepEvents } from "./step-events";
import { StepRunner } from "./step-runner";
import { type TrustOptions, trust } from "./trust";
import { bump } from "./version";
import { ManifestWorkspace } from "./workspace/manifest-workspace";
import type { Package, Workspace } from "./workspace/workspace";

export type {
	DeployedArtifact,
	PlannedStep,
	PlanOptions,
	PublishOptions,
	ReleaseOptions,
	ReleasePlan,
	ReleaseStatus,
	StatusOptions,
} from "./release-options";

/**
 * Everything a ship puts out (packages, stacks, images, commits), ready to go at one version. `releases`
 * composes these; `release()` runs the whole flow as declared steps: preflight,
 * version, artifacts in stage order, and any steps the caller added.
 *
 * ```ts
 * await releases.lockstep(releases.npm("@scope/foo"), releases.git()).release();
 * ```
 *
 * A release that dies partway leaves a RELEASE file behind, and the next
 * `release()` finishes that version instead of bumping past it: every step
 * that landed is skipped, so nothing goes out twice.
 */
export class Release {
	/** Every artifact, in the order they will run: publish, then tag, then notes. */
	readonly artifacts: readonly Artifact[];
	/** Steps the caller declared beside the artifacts. */
	readonly steps: readonly Step[];

	constructor(artifacts: readonly Artifact[], steps: readonly Step[] = []) {
		// Sorting here, stably, is what frees declarations from caring about
		// order: a tag cannot come before the packages it names however the
		// artifacts were written down.
		this.artifacts = artifacts.toSorted(
			(left, right) =>
				STAGES.indexOf(left.stage ?? "publish") -
				STAGES.indexOf(right.stage ?? "publish"),
		);
		this.steps = steps;
	}

	/** The workspace packages this publishes, gathered from every artifact. */
	get packages(): readonly string[] {
		return this.artifacts.flatMap((artifact) => [...artifact.packages]);
	}

	/**
	 * What every artifact that can say has live, beside the workspace's own
	 * version, so a caller can show which lags. Artifacts with no `deployed`,
	 * such as a build, are left out.
	 */
	async status(opts: StatusOptions = {}): Promise<ReleaseStatus> {
		const ps = opts.ps ?? new NodePs();
		const workspace =
			opts.workspace ??
			(await ManifestWorkspace.at(ps.cwd(), {
				fs: opts.fs,
				ps,
				project: opts.project,
			}));
		const reading = this.artifacts.flatMap((artifact) => {
			const deployed = artifact.deployed?.bind(artifact);
			return deployed === undefined ? [] : [{ artifact, deployed }];
		});
		const [version, artifacts] = await Promise.all([
			workspace.version(),
			Promise.all(
				reading.map(async ({ artifact, deployed }) => ({
					name: artifact.name ?? statusName(artifact),
					packages: artifact.packages,
					deployed: await deployed(),
				})),
			),
		]);
		return { version, artifacts };
	}

	/** Releases everything, asking first. Run it again after a failure. */
	async release(opts: ReleaseOptions = {}): Promise<void> {
		const ps = opts.ps ?? new NodePs();
		const log = opts.log ?? new ConsoleLogger();
		const fs = opts.fs ?? new NodeFs();
		const workspace =
			opts.workspace ??
			(await ManifestWorkspace.at(ps.cwd(), { fs, ps, project: opts.project }));
		const git = opts.git ?? new CliGit(workspace.root, { ps });
		const packages = order(await workspace.packages());
		const file = new ReleaseFile(workspace.root, { fs, project: opts.project });
		const found = await file.read();
		const next: Next = {
			bump: opts.bump ?? "patch",
			resuming: found !== null,
			current: await workspace.version(),
		};
		const version = found?.version ?? bump(next.current, next.bump);
		const owned =
			opts.dryRun === true
				? { dir: await mkdtemp(join(tmpdir(), "ship-dry-run-")) }
				: undefined;
		const dryRun =
			owned ?? (typeof opts.dryRun === "object" ? opts.dryRun : undefined);
		if (dryRun !== undefined) {
			await fs.mkdir(`${dryRun.dir}/packs`);
		}
		const cut = new Cut(version, packages, {
			log,
			root: workspace.root,
			dryRun,
			force: opts.force,
		});
		const events = new StepEvents(
			ps.env("SPLATES_SHIP_EVENTS"),
			fs,
			opts.wallClock,
		);
		const answerPath = ps.env("SPLATES_SHIP_ANSWERS");
		if (answerPath && !ps.env("SPLATES_SHIP_EVENTS")) {
			throw new Error("SPLATES_SHIP_ANSWERS requires SPLATES_SHIP_EVENTS");
		}
		const shipAnswers = answerPath
			? new ShipAnswers(answerPath, fs, events, opts.timer)
			: undefined;
		const runner = new StepRunner(events, opts.timer, shipAnswers);

		const declared = this.declare({
			workspace,
			git,
			packages,
			cut,
			version,
			resuming: found !== null,
		});
		if (dryRun !== undefined) {
			await rehearse({
				...declared,
				artifacts: this.artifacts,
				packages: this.packages,
				cut,
				runner,
				git,
				fs,
				ps,
				owned: owned !== undefined,
			});
			return;
		}
		const { preflight, before, versionStep, going } = declared;
		await runner.declare([preflight, ...before, versionStep, ...going]);
		await runner.run(preflight, cut);
		for (const step of before) {
			await runner.run(step, cut);
		}

		const confirmation = new Confirmation({
			ask: opts.prompt ?? prompt,
			log,
			yes: opts.yes,
			approved: opts.approved,
			answers: shipAnswers,
		});
		if (
			!(await confirmation.release(
				this.packages,
				version,
				next,
				await this.live(version, opts.force === true),
			))
		) {
			log.info(color.red("aborted"));
			return;
		}

		const state = found ?? { version, done: [] };
		await file.write(state);
		try {
			await runner.run(versionStep, cut);
			for (const declaration of going) {
				const done =
					declaration.step.stage !== "build" &&
					state.done.includes(declaration.id);
				if (
					!done &&
					!(await confirmation.step(declaration.step, declaration.id))
				) {
					return;
				}
				await runner.run(declaration, cut, { done });
				if (!state.done.includes(declaration.id)) {
					state.done.push(declaration.id);
				}
				await file.write(state);
			}
		} finally {
			for (const artifact of this.artifacts) {
				await artifact.clean?.(cut);
			}
		}
		await file.clear();
		log.info(color.green(`shipped ${version}`));
	}

	/**
	 * What the confirm says of the artifacts already live at `version`: each
	 * is redeployed under `force` and skipped otherwise.
	 */
	private async live(version: string, force: boolean): Promise<string[]> {
		const lines: string[] = [];
		for (const artifact of this.artifacts) {
			if ((await artifact.deployed?.()) === version) {
				const name = artifact.name ?? statusName(artifact);
				lines.push(
					`${name} is already live at ${version}: ${force ? "deploying again" : "skipped, pass force to deploy again"}`,
				);
			}
		}
		return lines;
	}

	/**
	 * Has each registry trust the CI job that `publish()` runs in, as npm's
	 * trusted publisher entry for each package: the one setup publishing
	 * without a token or 2FA takes. Every artifact is tried, and the ones that
	 * failed are named together at the end.
	 */
	async trust(opts: TrustOptions = {}): Promise<void> {
		await trust(this.artifacts, opts);
	}

	/**
	 * Publishes what the declaration names that the registry lacks, at the
	 * version the workspace already stands at, from a checkout of a release
	 * commit. It is the half of a release a CI job npm trusts can do: only the
	 * build and publish stages run, each registry in its trusted mode, so
	 * nothing is stamped, tagged, approved or noted. A version the registry
	 * already has is skipped, so a rerun publishes nothing it did.
	 */
	async publish(opts: PublishOptions = {}): Promise<void> {
		const ps = opts.ps ?? new NodePs();
		const log = opts.log ?? new ConsoleLogger();
		const fs = opts.fs ?? new NodeFs();
		const workspace =
			opts.workspace ??
			(await ManifestWorkspace.at(ps.cwd(), { fs, ps, project: opts.project }));
		const packages = order(await workspace.packages());
		declares(this.packages, packages);
		const version = await workspace.version();
		const cut = new Cut(version, packages, { log, root: workspace.root });
		const going = sequence(
			this.artifacts.filter(
				(artifact) =>
					artifact.stage === "build" ||
					artifact.stage === undefined ||
					artifact.stage === "publish",
			),
			packages,
		);
		const publishing = going.map(
			(artifact) => artifact.trusted?.() ?? artifact,
		);
		const steps = identify(
			publishing
				.flatMap((artifact) =>
					stepsFor(artifact, cut).map((step) => ({
						step,
						owner: artifact.name ?? statusName(artifact),
					})),
				)
				.filter(
					({ step }) => step.stage === "build" || step.stage === "publish",
				)
				.toSorted(
					(left, right) => stageRank(left.step) - stageRank(right.step),
				),
		).map(({ id, step }) => ({ id, step }));
		const runner = new StepRunner(
			new StepEvents(ps.env("SPLATES_SHIP_EVENTS"), fs, opts.wallClock),
			opts.timer,
		);
		await runner.declare(steps);
		try {
			for (const declaration of steps) {
				await runner.run(declaration, cut);
			}
		} finally {
			for (const artifact of publishing) {
				await artifact.clean?.(cut);
			}
		}
		log.info(color.green(`published ${version}`));
	}

	/** Every step a release runs, in order, as both `release()` and `plan()` read it. */
	private declare(at: Declaring): Declared {
		const { workspace, git, packages, cut, version, resuming } = at;
		const preflight: StepDeclaration = {
			id: "preflight",
			step: {
				name: "Preflight",
				deadline: Duration.secs(30),
				stage: "preflight",
				run: async () => {
					const [branch, trunk] = [
						await git.branch(),
						await git.defaultBranch(),
					];
					if (branch !== trunk) {
						if (cut.dryRun === undefined) {
							throw new Error(
								`on "${branch}": releases go out from "${trunk}"`,
							);
						}
						cut.log.info(
							color.yellow(
								`on "${branch}": a release would refuse it, as releases go out from "${trunk}"`,
							),
						);
					}
					if (!(await git.clean())) {
						const stamps = resuming ? await ownStamps(git) : [];
						if (stamps.length === 0) {
							const files = ((await git.changes?.()) ?? [])
								.filter((change) => !change.versionOnly)
								.map((change) => change.path);
							throw new Error(
								`uncommitted changes: releases go out from a clean tree, so commit or discard them first${files.length > 0 ? ` (${files.join(", ")})` : ""}`,
							);
						}
						// A run that died between stamping and committing left only its
						// own stamps; the version step stamps again from the same version.
						await git.discard(stamps);
						cut.log.info(
							`put back ${stamps.length} stamped file${stamps.length === 1 ? "" : "s"} a dead release left`,
						);
					}
					declares(this.packages, packages);
					for (const artifact of this.artifacts) {
						await artifact.verify?.(cut);
					}
				},
			},
		};
		const before = this.steps
			.filter((step) => step.stage === "preflight")
			.map((step, index) => ({ id: `preflight:${index}:${step.name}`, step }));
		const ordered = sequence(this.artifacts, packages);
		const stamps = ordered.filter((artifact) => artifact.stage === "stamp");
		const stamping = this.steps.filter((step) => step.stage === "stamp");
		const versionStep: StepDeclaration = {
			id: "version",
			step: {
				name: `Version ${version}`,
				deadline: Duration.mins(2),
				stage: "stamp",
				run: async () => {
					await workspace.setVersion(version);
					for (const artifact of stamps) {
						await artifact.publish(cut);
					}
					for (const step of stamping) {
						await step.run(cut);
					}
					if (cut.dryRun === undefined) {
						await git.commitAll(`Release ${version}`);
					}
				},
			},
		};
		const going = identify(
			[
				...ordered
					.filter((artifact) => artifact.stage !== "stamp")
					.flatMap((artifact) =>
						stepsFor(artifact, cut).map((step) => ({ step, artifact })),
					),
				...this.steps
					.filter(
						(step) => step.stage !== "preflight" && step.stage !== "stamp",
					)
					.map((step) => ({ step, artifact: undefined })),
			]
				.toSorted((left, right) => stageRank(left.step) - stageRank(right.step))
				.map(({ step, artifact }) => ({
					step,
					owner: artifact ? (artifact.name ?? statusName(artifact)) : "release",
					artifact: artifact && (artifact.name ?? statusName(artifact)),
					packages: artifact?.packages,
				})),
		).map(({ owner: _owner, ...declaration }) => declaration);
		return { preflight, before, versionStep, going };
	}

	/**
	 * What `release()` would run, in order, without running any of it. Reads the
	 * workspace and a RELEASE file left by a run that died, and nothing else, so
	 * the version and the step ids are the ones the run's events will carry.
	 */
	async plan(opts: PlanOptions = {}): Promise<ReleasePlan> {
		const ps = opts.ps ?? new NodePs();
		const fs = opts.fs ?? new NodeFs();
		const workspace =
			opts.workspace ??
			(await ManifestWorkspace.at(ps.cwd(), { fs, ps, project: opts.project }));
		const git = opts.git ?? new CliGit(workspace.root, { ps });
		const packages = order(await workspace.packages());
		const found = await new ReleaseFile(workspace.root, {
			fs,
			project: opts.project,
		}).read();
		const version =
			found?.version ?? bump(await workspace.version(), opts.bump ?? "patch");
		const cut = new Cut(version, packages, {
			log: opts.log ?? new ConsoleLogger(),
			root: workspace.root,
		});
		const { preflight, before, versionStep, going } = this.declare({
			workspace,
			git,
			packages,
			cut,
			version,
			resuming: found !== null,
		});
		return {
			schema: 1,
			version,
			resuming: found !== null,
			steps: [preflight, ...before, versionStep, ...going].map(
				({ id, step, artifact, packages: covered }) => ({
					id,
					name: step.name,
					stage: step.stage ?? "publish",
					packages: [...(covered ?? [])],
					...(artifact === undefined ? {} : { artifact }),
					deadlineMs: step.deadline.ms,
				}),
			),
		};
	}
}

/**
 * `artifacts` in the order they run: by stage, and within a stage by where the
 * packages they name fall in the dependency order. The stage key is applied
 * again here rather than trusted from the constructor, so the sequence is
 * right however the artifacts arrived.
 *
 * An artifact naming no packages, or naming one the workspace does not have,
 * sorts to the end of its stage, where it cannot come between two that do.
 */
function sequence(
	artifacts: readonly Artifact[],
	packages: readonly Package[],
): Artifact[] {
	const rank = new Map(packages.map((pkg, index) => [pkg.name, index]));
	const at = (artifact: Artifact): number => {
		const ranks = artifact.packages.map(
			(name) => rank.get(name) ?? packages.length,
		);
		return ranks.length === 0 ? packages.length : Math.min(...ranks);
	};
	return artifacts.toSorted((left, right) => {
		const stages =
			STAGES.indexOf(left.stage ?? "publish") -
			STAGES.indexOf(right.stage ?? "publish");
		return stages !== 0 ? stages : at(left) - at(right);
	});
}

/**
 * Gives each step an id from what it is, its owner and name, so a RELEASE
 * file's finished steps still match after the declaration gains, loses or
 * reorders steps. Only true duplicates are numbered, in order. Ids from the
 * older index format (`step:0:name`) match nothing here, so they skip nothing.
 */
function identify<T extends { step: Step; owner: string }>(
	steps: T[],
): (T & { id: string })[] {
	const seen = new Map<string, number>();
	return steps.map((entry) => {
		const base = `step:${entry.owner}:${entry.step.name}`;
		const count = (seen.get(base) ?? 0) + 1;
		seen.set(base, count);
		return { ...entry, id: count === 1 ? base : `${base}#${count}` };
	});
}

/** The steps an artifact declares, or its whole publish operation as one. */
function stepsFor(artifact: Artifact, cut: Cut): Step[] {
	if (artifact.steps !== undefined) {
		return artifact.steps(cut).map((step) => ({
			...step,
			stage: step.stage ?? artifact.stage,
		}));
	}
	return [
		{
			name: artifactName(artifact),
			deadline: deadlineFor(artifact.stage),
			stage: artifact.stage,
			run: (at) => artifact.publish(at),
			...(artifact.dryRun === undefined
				? {}
				: { dryRun: (at: Cut) => artifact.dryRun?.(at) ?? Promise.resolve() }),
		},
	];
}

function artifactName(artifact: Artifact): string {
	if (artifact.packages.length > 0) {
		return `Publish ${artifact.packages.join(" ")}`;
	}
	switch (artifact.stage) {
		case "build":
			return "Build";
		case "tag":
			return "Tag";
		case "notes":
			return "Release notes";
		case "stamp":
			return "Stamp";
		default:
			return "Publish";
	}
}

/** What status calls an artifact that names itself nothing. */
export function statusName(artifact: Artifact): string {
	return artifact.packages.length > 0
		? artifact.packages.join(" ")
		: (artifact.stage ?? "publish");
}

function deadlineFor(stage: Stage | undefined): Duration {
	switch (stage) {
		case "build":
			return Duration.mins(10);
		case "tag":
		case "notes":
			return Duration.mins(2);
		default:
			return Duration.mins(5);
	}
}

function stageRank(step: Step): number {
	return STAGES.indexOf(
		step.stage === "preflight" ? "publish" : (step.stage ?? "publish"),
	);
}

/**
 * Throws unless the declaration and the workspace agree, saying every way they
 * differ at once: fixing a declaration one name per run is nobody's idea of a
 * good time.
 */
function declares(declared: readonly string[], packages: Package[]): void {
	if (declared.length === 0) {
		throw new Error("no packages are declared: there is nothing to publish");
	}
	const drift: string[] = [];
	const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
	const names = new Set(declared);
	for (const name of names) {
		const pkg = byName.get(name);
		if (pkg === undefined) {
			drift.push(
				`"${name}" is declared but the workspace has no package by that name`,
			);
		}
	}
	for (const pkg of packages) {
		if (!pkg.private && !names.has(pkg.name)) {
			drift.push(
				`"${pkg.name}" is public but not declared: declare it or mark it private`,
			);
		}
	}
	if (drift.length > 0) {
		throw new Error(drift.join("\n"));
	}
}

/** What the steps are declared against. */
interface Declaring {
	workspace: Workspace;
	git: Git;
	packages: Package[];
	cut: Cut;
	version: string;
	/** Whether a RELEASE file says a release is already under way. */
	resuming: boolean;
}

/**
 * The changed files when every one is a stamp, else none: a stray edit beside
 * the stamps means the tree is not just a dead release's, and it still stops.
 */
async function ownStamps(git: Git): Promise<string[]> {
	const changes = (await git.changes?.()) ?? [];
	return changes.length > 0 && changes.every((change) => change.versionOnly)
		? changes.map((change) => change.path)
		: [];
}

interface Declared {
	preflight: StepDeclaration;
	before: StepDeclaration[];
	versionStep: StepDeclaration;
	going: StepDeclaration[];
}
