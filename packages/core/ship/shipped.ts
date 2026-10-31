import { relative } from "node:path";
import { color } from "core/log";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import { manifestAt } from "./bundle/reach";
import type { Cut } from "./cut";
import type { Step } from "./step";
import { ManifestWorkspace } from "./workspace/manifest-workspace";
import type { Workspace } from "./workspace/workspace";

/** The dependency fields a package going out can name another project's package in. */
const FIELDS = ["dependencies", "peerDependencies"] as const;

/** What `ShippedCheck` looks at, and who it asks. */
export interface ShippedOptions {
	/** The project folder going out, relative to the workspace root, such as `vexml`. */
	project: string;
	/**
	 * Asks whether to go ahead anyway; the platform's `prompt()` by default,
	 * which a run with no terminal answers with nothing, so it stops.
	 */
	// vet-ignore objects-over-callbacks: the platform's own prompt() is the
	// dependency here, and it is a bare function
	prompt?: (message: string) => string | null;
	/** Where the packages are found; the manifest workspace around the release's root by default. */
	workspace?: Workspace;
	fs?: Fs;
	ps?: Ps;
}

/** A package of another project with commits since its last release. */
export interface Unshipped {
	name: string;
	/** Its project folder, relative to the workspace root, which ships it. */
	project: string;
	/** Each commit since, as `<sha> <subject>`, newest first. */
	commits: string[];
}

/**
 * Stops a release that depends on another project's package while that
 * project has changes it has not shipped. The release would go out against
 * the version the registry has, so a change it came to rely on, a fix with no
 * new types included, would be missing for everyone who installs it. The
 * commits are listed and the person asked whether to go ahead anyway, for
 * changes the release does not need. A dry run lists them and asks nothing.
 *
 * A package's last release is the last commit that changed its manifest's
 * `version`, which is what a release's stamp commits, and only commits to the
 * package's own folder count: the project's tooling never goes out with it.
 */
export class ShippedCheck implements Step {
	readonly name = "Dependencies shipped";
	readonly deadline = Duration.mins(1);
	readonly stage = "preflight" as const;

	private readonly fs: Fs;
	private readonly ps: Ps;

	constructor(private readonly opts: ShippedOptions) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
	}

	async run(cut: Cut): Promise<void> {
		const unshipped = await this.unshipped(cut);
		if (unshipped.length === 0) {
			return;
		}
		this.list(cut, unshipped);
		const ask = this.opts.prompt ?? prompt;
		const answer = ask("go ahead without shipping them first? [y/N]");
		if (answer?.trim().toLowerCase() !== "y") {
			throw new Error(
				`ship ${unshipped.map((one) => one.project).join(", ")} first`,
			);
		}
	}

	async dryRun(cut: Cut): Promise<void> {
		const unshipped = await this.unshipped(cut);
		if (unshipped.length > 0) {
			this.list(cut, unshipped);
			cut.log.info(color.yellow("a release would ask whether to go ahead"));
		}
	}

	/** Every other project's package this one depends on that has commits since its release. */
	async unshipped(cut: Cut): Promise<Unshipped[]> {
		const workspace =
			this.opts.workspace ??
			(await ManifestWorkspace.at(cut.root, { fs: this.fs, ps: this.ps }));
		const root = workspace.root;
		const packages = await workspace.packages();
		const inside = (dir: string, project: string) =>
			dir === `${root}/${project}` || dir.startsWith(`${root}/${project}/`);
		const own = packages.filter(
			(pkg) => !pkg.private && inside(pkg.dir, this.opts.project),
		);
		const needed = new Set<string>();
		for (const pkg of own) {
			const manifest = await manifestAt(this.fs, pkg.dir);
			for (const field of FIELDS) {
				for (const [name, range] of Object.entries(manifest[field] ?? {})) {
					if (range.startsWith("workspace:")) {
						needed.add(name);
					}
				}
			}
		}
		const found: Unshipped[] = [];
		for (const pkg of packages) {
			if (
				!needed.has(pkg.name) ||
				pkg.private ||
				inside(pkg.dir, this.opts.project)
			) {
				continue;
			}
			const project = relative(root, pkg.dir).split("/")[0] as string;
			const release = await this.git(
				root,
				"log",
				"-1",
				"--format=%H",
				"-G",
				'"version":',
				"--",
				`${relative(root, pkg.dir)}/package.json`,
			);
			const commits = await this.git(
				root,
				"log",
				"--format=%h %s",
				...(release === "" ? ["HEAD"] : [`${release}..HEAD`]),
				"--",
				relative(root, pkg.dir),
			);
			if (commits !== "") {
				found.push({ name: pkg.name, project, commits: commits.split("\n") });
			}
		}
		return found;
	}

	private list(cut: Cut, unshipped: readonly Unshipped[]): void {
		for (const one of unshipped) {
			cut.log.info(
				`${one.name} ${color.yellow("has changes not yet shipped")}, so this release would go out against the version the registry has, without them:`,
			);
			for (const commit of one.commits) {
				cut.log.info(`  ${commit}`);
			}
		}
	}

	private async git(cwd: string, ...args: string[]): Promise<string> {
		const result = await this.ps.spawnCapture(["git", ...args], { cwd });
		if (result.exitCode !== 0) {
			throw new Error(
				`git ${args.join(" ")} failed in ${cwd}: ${result.stderr.trim()}`,
			);
		}
		return result.stdout.trim();
	}
}
