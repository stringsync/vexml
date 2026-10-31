import { join, relative } from "node:path";
import { color } from "core/log";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import type { Artifact, Stage } from "../artifact/artifact";
import type { Bundle } from "../bundle/bundle";
import { VendorBundle } from "../bundle/vendor-bundle";
import type { Cut } from "../cut";
import { CliGit } from "../git/cli-git";
import { PublishWorkflow } from "../publish-workflow";
import type { GithubActions } from "../registry/github-actions";
import type { Step } from "../step";
import type { MirrorOptions } from "./mirror-options";
import { MirrorStep, type PreparedMirror } from "./mirror-step";

/** What `MirrorBuild` mirrors, and how it builds the packages there. */
export interface MirrorBuildOptions extends MirrorOptions {
	/**
	 * Builds each package in the mirror; a `VendorBundle` by default, which
	 * folds in the mirror's own copy of `core`.
	 */
	bundle?: Bundle;
	/**
	 * Publishes through GitHub Actions in the mirror's repository: the same
	 * `GithubActions` given to each `releases.npm` as `via`, made with the
	 * mirror's `repo`. Its run starts from the mirror's commit, which carries
	 * the publish workflow; give `publish` too.
	 */
	via?: GithubActions;
	/**
	 * The command the mirror's publish workflow runs, from the mirror's root,
	 * to build and publish at the version the commit stands at, such as
	 * `bin/mdom publish`, which calls `Release.publish()`. The workflow is
	 * written into the mirror commit.
	 */
	publish?: string;
}

/**
 * Builds what a release publishes from its public repository rather than the
 * workspace: in the build stage it writes the mirror's commit to a checkout
 * of the remote, installs it as anyone cloning it would, from the registry,
 * and builds each of the project's public packages there, so what goes out
 * is what the public repository builds. A package of another project is
 * installed at its published release, so one that needs a change not yet
 * released fails here. The tag stage pushes that same commit, and its tag.
 *
 * Use it in place of `build`, `vendor` and `mirror`, not beside them.
 */
export class MirrorBuild implements Artifact {
	readonly packages: readonly string[] = [];
	readonly stage: Stage = "build";
	readonly name: string;

	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly mirror: MirrorStep;
	private readonly bundle: Bundle;
	/** The mirror the build made and the step that pushes it, once built. */
	private built?: { step: MirrorStep; prepared: PreparedMirror };

	constructor(private readonly opts: MirrorBuildOptions) {
		this.name = `Build ${opts.project} in its mirror`;
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.mirror = new MirrorStep(opts);
		this.bundle = opts.bundle ?? new VendorBundle({ fs: this.fs, ps: this.ps });
	}

	steps(): readonly Step[] {
		const build = (cut: Cut) => this.build(cut);
		const push = (cut: Cut) => this.push(cut);
		return [
			{
				name: this.name,
				deadline: Duration.mins(15),
				stage: "build",
				run: build,
				dryRun: build,
			},
			{
				name: `Mirror ${this.opts.project}`,
				deadline: Duration.mins(5),
				stage: "tag",
				run: push,
				dryRun: async (cut) => {
					await push(cut);
					cut.log.info(
						`${this.opts.project} ${color.yellow("would push to")} ${this.opts.remote}`,
					);
				},
			},
		];
	}

	async publish(cut: Cut): Promise<void> {
		await this.build(cut);
		await this.push(cut);
	}

	async clean(): Promise<void> {
		if (this.built !== undefined) {
			await this.fs.rm(this.built.step.scratch, {
				recursive: true,
				force: true,
			});
			this.built = undefined;
		}
	}

	/**
	 * Writes the mirror, installs it and commits it with the lockfile that
	 * install wrote, which is what its publish workflow installs from, then
	 * builds the packages there.
	 */
	private async build(cut: Cut): Promise<void> {
		await this.clean();
		// A dry run mirrors onto a copy of the remote, which its push then reaches.
		const step =
			cut.dryRun === undefined ? this.mirror : await this.mirror.rehearsal(cut);
		const prepared = await step.prepare(cut, {
			before: async (mirror) => {
				if (this.opts.publish !== undefined) {
					await new PublishWorkflow({
						command: this.opts.publish,
						fs: this.fs,
					}).write(mirror);
				}
				await this.spawn(["bun", "install"], mirror);
			},
		});
		this.built = { step, prepared };
		this.opts.via?.use(new CliGit(prepared.dir, { ps: this.ps }));
		const going = cut.packages.filter(
			(pkg) =>
				!pkg.private &&
				(pkg.dir === prepared.from || pkg.dir.startsWith(`${prepared.from}/`)),
		);
		for (const pkg of going) {
			const dir = join(prepared.dir, relative(prepared.from, pkg.dir));
			cut.stage(pkg.name, await this.bundle.build(dir));
		}
		cut.log.info(
			`${going.length} packages ${color.green("built")} in the ${this.opts.project} mirror`,
		);
	}

	private async push(cut: Cut): Promise<void> {
		if (this.built === undefined) {
			throw new Error(
				`the ${this.opts.project} mirror was never built, so there is nothing to push`,
			);
		}
		await this.built.step.push(cut, this.built.prepared);
	}

	private async spawn(argv: string[], cwd: string): Promise<void> {
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture(argv, {
			cwd,
		});
		if (exitCode !== 0) {
			const said = `${stdout}\n${stderr}`.trim().split("\n").slice(-20);
			throw new Error(
				`${argv.join(" ")} failed in the ${this.opts.project} mirror:\n${said.join("\n")}`,
			);
		}
	}
}
