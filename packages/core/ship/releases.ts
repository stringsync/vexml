import { color } from "core/log";
import { type Fs, NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import type { Artifact } from "./artifact/artifact";
import { BunBundle } from "./bundle/bun-bundle";
import type { Bundle } from "./bundle/bundle";
import { BundleArtifact } from "./bundle/bundle-artifact";
import { VendorBundle, type VendorBundleOptions } from "./bundle/vendor-bundle";
import { CliGit } from "./git/cli-git";
import { GitArtifact, type GitArtifactOptions } from "./git/git-artifact";
import { CliGithub, type CliGithubOptions } from "./github/cli-github";
import { GithubArtifact } from "./github/github-artifact";
import { MirrorBuild, type MirrorBuildOptions } from "./mirror/mirror-build";
import { type MirrorOptions, MirrorStep } from "./mirror/mirror-step";
import {
	PublishWorkflow,
	type PublishWorkflowOptions,
} from "./publish-workflow";
import type { GithubActions } from "./registry/github-actions";
import { NpmRegistry, type NpmRegistryOptions } from "./registry/npm-registry";
import type { Registry } from "./registry/registry";
import { RegistryArtifact } from "./registry/registry-artifact";
import { Release } from "./release";
import { ShippedCheck, type ShippedOptions } from "./shipped";
import { SkillArtifact, type SkillArtifactOptions } from "./skill-artifact";
import type { Step } from "./step";
import { ManifestWorkspace } from "./workspace/manifest-workspace";

/** What `releases.workspace` reads the roster through; the real system by default. */
export interface WorkspaceReleaseOptions {
	/** The project folder whose public packages go out; every package of the workspace by default. */
	project?: string;
	fs?: Fs;
	ps?: Ps;
	/** Publish through GitHub Actions instead of from this machine, as `releases.npm`'s `via`. */
	via?: GithubActions;
}

/**
 * Composes a release: name each package and where it goes, add the tag and
 * the notes, and call `release()` on the result.
 *
 * ```ts
 * await releases.lockstep(
 * 	releases.npm("@scope/foo"),
 * 	releases.custom("@scope/baz", new S3Registry()),
 * 	releases.git(),
 * 	releases.github(),
 * ).release();
 * ```
 */
export class releases {
	private constructor() {}

	/** A package the npm registry carries. */
	static npm(name: string, opts: NpmRegistryOptions = {}): Release {
		return new Release([new RegistryArtifact(name, new NpmRegistry(opts))]);
	}

	/** A package `registry` carries, for wherever npm is not the answer. */
	static custom(name: string, registry: Registry): Release {
		return new Release([new RegistryArtifact(name, registry)]);
	}

	/** A caller-defined step, composed beside artifacts and other releases. */
	static step(step: Step): Release {
		return new Release([], [step]);
	}

	/**
	 * Stops the release, before it asks to go out, when the project depends on
	 * another project's package that has commits since its last release: the
	 * release would go out against the version the registry has, without them.
	 * It lists them and asks whether to go ahead anyway.
	 */
	static shipped(opts: ShippedOptions): Release {
		return releases.step(new ShippedCheck(opts));
	}

	/**
	 * Pushes existing Git commits to origin during preflight. Place this before
	 * other preflight steps in lockstep to push before running their gates.
	 * This is opt-in and does not create a tag or a release commit.
	 */
	static push(opts: GitArtifactOptions = {}): Release {
		return releases.step({
			name: "Push commits",
			deadline: Duration.mins(2),
			stage: "preflight",
			run: async (cut) => {
				const git = opts.git ?? new CliGit(cut.root, { ps: opts.ps });
				await git.push(await git.branch());
			},
			dryRun: async (cut) => {
				cut.log.info(color.yellow("would push the branch's commits"));
			},
		});
	}

	/**
	 * Keeps the generated publish workflow current: a preflight step writes it
	 * when it is missing or stale, so it lands in the release commit.
	 */
	static publishWorkflow(opts: PublishWorkflowOptions): Release {
		const workflow = new PublishWorkflow(opts);
		return releases.step({
			name: "Publish workflow",
			deadline: Duration.secs(30),
			stage: "preflight",
			run: async (cut) => {
				if (await workflow.write(cut.root)) {
					cut.log.info(
						"wrote the publish workflow: commit it with the release",
					);
				}
			},
		});
	}

	/** The tag, and the push that publishes it. */
	static git(opts: GitArtifactOptions = {}): Release {
		return new Release([new GitArtifact(opts)]);
	}

	/**
	 * Building every package before any of them goes out, and clearing what that
	 * left once the release is over. Add it to any release whose packages
	 * publish something other than the source they were written in.
	 */
	static build(bundle?: Bundle): Release {
		return new Release([new BundleArtifact(bundle)]);
	}

	/**
	 * `build`, for a package that depends on private workspace packages and
	 * still publishes alone: each one it reaches is built into `dist/vendor`
	 * and the imports rewritten to it, so the published package needs none of
	 * them on a registry. Use it in place of `build`, not beside it.
	 */
	static vendor(opts: VendorBundleOptions = {}): Release {
		return new Release([new BundleArtifact(new VendorBundle(opts))]);
	}

	/**
	 * Mirrors a project to its public repository so that the repository stands
	 * alone from the workspace: the project folder, with the source of the
	 * workspace package it reaches added as a private package of its own.
	 * Nothing is pushed when the mirror's tree did not change. Pair it with
	 * `vendor`, which then works unchanged in the mirror, where `core` is a
	 * private workspace package.
	 */
	static mirror(opts: MirrorOptions): Release {
		return releases.step(new MirrorStep(opts));
	}

	/**
	 * `mirror`, with the packages built in the mirror rather than the
	 * workspace: the release writes the mirror's commit to a checkout of the
	 * remote, installs it from the registry as anyone cloning it would, builds
	 * each public package of the project there and publishes that build, then
	 * pushes the commit at the tag stage. What goes out is what the public
	 * repository builds, against the releases of other projects it depends on.
	 * Use it in place of `build`, `vendor` and `mirror`.
	 */
	static mirrored(opts: MirrorBuildOptions): Release {
		return new Release([new MirrorBuild(opts)]);
	}

	/**
	 * An agent skill document whose frontmatter version this release stamps,
	 * given relative to the workspace root. The stamp lands in the release
	 * commit, so a skill bundled into a package says the version that bundled
	 * it rather than the one before.
	 */
	static skill(path: string, opts: SkillArtifactOptions = {}): Release {
		return new Release([new SkillArtifact(path, opts)]);
	}

	/** The release notes GitHub publishes for the tag. */
	static github(opts: CliGithubOptions = {}): Release {
		return new Release([new GithubArtifact(new CliGithub(opts))]);
	}

	/**
	 * Every declaration given, at one version. Stages decide when steps run, so
	 * packages always publish before the tag that names them, and notes come last.
	 */
	static lockstep(...declarations: Array<Artifact | Release | Step>): Release {
		const artifacts: Artifact[] = [];
		const steps: Step[] = [];
		for (const declaration of declarations) {
			if (declaration instanceof Release) {
				artifacts.push(...declaration.artifacts);
				steps.push(...declaration.steps);
			} else if ("run" in declaration) {
				steps.push(declaration);
			} else {
				artifacts.push(declaration);
			}
		}
		return new Release(artifacts, steps);
	}

	/**
	 * The workspace's own release: every public package around the working
	 * directory onto npm, tagged, with GitHub release notes. This is what
	 * `wiz dev ship` runs when nothing declares otherwise.
	 */
	static async workspace(opts: WorkspaceReleaseOptions = {}): Promise<Release> {
		const ps = opts.ps ?? new NodePs();
		const workspace = await ManifestWorkspace.at(ps.cwd(), {
			fs: opts.fs,
			ps,
			project: opts.project,
		});
		const registry = new NpmRegistry({ ps, via: opts.via });
		const artifacts: Artifact[] = (await workspace.packages())
			.filter((pkg) => !pkg.private)
			.map((pkg) => new RegistryArtifact(pkg.name, registry));
		return new Release([
			new BundleArtifact(new BunBundle({ fs: opts.fs, ps })),
			...artifacts,
			new GitArtifact({ git: new CliGit(workspace.root, { ps }) }),
			new GithubArtifact(new CliGithub({ ps })),
		]);
	}
}
