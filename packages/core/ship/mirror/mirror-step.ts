import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { color } from "core/log";
import {
	type Fs,
	type Glob,
	NodeFs,
	NodeGlob,
	NodePs,
	type Ps,
} from "core/system";
import { Duration } from "core/time";
import {
	catalogAt,
	entries,
	isPackage,
	keyOf,
	manifestAt,
	reach,
	specifiers,
} from "../bundle/reach";
import type { Cut } from "../cut";
import type { Step } from "../step";
import { ManifestWorkspace } from "../workspace/manifest-workspace";
import type { Package } from "../workspace/workspace";
import { AGENT_FILES } from "./agent-files";
import { guard, TRAILER } from "./mirror-guard";
import type { MirrorOptions } from "./mirror-options";
import { MirrorTooling } from "./mirror-tooling";
import { FIELDS, type Json, sourceManifest } from "./source-manifest";

export type { MirrorConfig, MirrorOptions } from "./mirror-options";

/** What `MirrorStep.prepare` does besides writing the tree. */
export interface PrepareOptions {
	/**
	 * Runs once the tree is written and before it is committed, so whatever
	 * it adds is part of the mirror commit: a lockfile an install writes.
	 */
	before?(mirror: string): Promise<void>;
}

/** The mirror commit `MirrorStep.prepare` made, ready to push. */
export interface PreparedMirror {
	/** The mirror's checkout. */
	dir: string;
	/** The project folder it was written from, which its root stands for. */
	from: string;
	/** Whether the tree changed, and so whether there is a commit to push. */
	changed: boolean;
}

/** Packages that stay in the repository however something depends on them. */
const NEVER = ["scry", "vet"];

/** Never copied, whatever the exclude globs say. */
const SKIPPED = new Set([".git", "node_modules", "dist"]);

/** Where the reached source sits in the mirror. */
const SOURCE_DIR = "packages";

/**
 * Makes a project's public repository stand alone from the workspace: copies
 * the project folder to the root of a checkout of `remote`, adds the source of
 * the workspace package it reaches (`core`) as a private workspace package of
 * its own, and pushes the result when the tree changed.
 *
 * Imports are left as they are. The project keeps `"core": "workspace:*"` and
 * keeps importing `core/...`; in the mirror that resolves to the copied
 * package, which carries only the `exports` the project reaches and the
 * dependencies those need, from the versions the workspace's catalog gives.
 * Files matching the config's `exclude` globs, matched against paths relative
 * to the workspace root, are left out of everything copied.
 */
export class MirrorStep implements Step {
	readonly name: string;
	readonly deadline = Duration.mins(5);
	readonly stage = "tag" as const;

	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly glob: Glob;
	private readonly tooling: MirrorTooling;

	constructor(private readonly opts: MirrorOptions) {
		this.name = `Mirror ${opts.project}`;
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.glob = opts.glob ?? new NodeGlob();
		this.tooling = new MirrorTooling({
			project: opts.project,
			fs: this.fs,
			ps: this.ps,
		});
	}

	async run(cut: Cut): Promise<void> {
		try {
			await this.push(cut, await this.prepare(cut));
		} finally {
			await this.fs.rm(this.scratch, { recursive: true, force: true });
		}
	}

	/** Where the mirror is checked out while it is built. */
	get scratch(): string {
		return (
			this.opts.scratch ??
			join(tmpdir(), `mirror-${this.opts.project}-${this.ps.pid}`)
		);
	}

	/**
	 * Checks out the remote into `scratch`, writes the mirror's tree over it and
	 * commits it there, pushing nothing; `push` sends what this left. The
	 * checkout stays for the caller to install, build or remove.
	 */
	async prepare(cut: Cut, opts: PrepareOptions = {}): Promise<PreparedMirror> {
		const { project, remote } = this.opts;
		const branch = this.opts.branch ?? "main";
		const mirror = `${this.scratch}/${project}`;
		await this.fs.rm(this.scratch, { recursive: true, force: true });
		await this.fs.mkdir(this.scratch);
		await this.git(this.scratch, "clone", remote, mirror);
		await this.checkout(mirror, branch);
		await guard(this.ps, mirror, project, this.opts.adopt);
		for (const entry of await this.fs.readdir(mirror)) {
			if (entry !== ".git") {
				await this.fs.rm(`${mirror}/${entry}`, { recursive: true });
			}
		}
		const root = await this.build(cut, mirror);
		await opts.before?.(mirror);
		await this.git(mirror, "add", "--all");
		const status = await this.git(mirror, "status", "--porcelain");
		if (status.trim() === "") {
			return { dir: mirror, from: `${root}/${project}`, changed: false };
		}
		const from = (await this.git(cut.root, "rev-parse", "HEAD")).trim();
		await this.git(
			mirror,
			"commit",
			"--message",
			`Mirror ${project} at ${cut.tag}`,
			"--message",
			`${TRAILER}: ${from}`,
		);
		return { dir: mirror, from: `${root}/${project}`, changed: true };
	}

	/** Pushes the commit `prepare` made, and its tag when the mirror is tagged. */
	async push(cut: Cut, prepared: PreparedMirror): Promise<void> {
		const { project, remote } = this.opts;
		if (prepared.changed) {
			await this.git(
				prepared.dir,
				"push",
				"origin",
				this.opts.branch ?? "main",
			);
		} else {
			cut.log.info(`${project} mirror is already current`);
		}
		// A resumed release finds the commit pushed already, but maybe not tagged.
		if (this.opts.tag && !(await this.tagged(prepared.dir, cut.tag))) {
			await this.git(prepared.dir, "tag", cut.tag);
			await this.git(prepared.dir, "push", "origin", cut.tag);
		}
		if (prepared.changed) {
			cut.log.info(`${project} mirrored to ${remote} at ${cut.tag}`);
		}
	}

	/**
	 * Mirrors as `run` would, onto a copy of the remote instead of the remote:
	 * the guard and the push meet its real history, and nothing reaches it.
	 */
	async dryRun(cut: Cut): Promise<void> {
		await (await this.rehearsal(cut)).run(cut);
		cut.log.info(
			`${this.opts.project} ${color.yellow("would push to")} ${this.opts.remote}`,
		);
	}

	/**
	 * Use this mirror's rehearsal in a dry run in place of the mirror: it runs,
	 * prepares and pushes as this one does, and nothing it does reaches the
	 * remote.
	 */
	async rehearsal(cut: Cut): Promise<MirrorStep> {
		// A bare copy of the remote, so the guard and the push meet its history.
		if (cut.dryRun === undefined) {
			throw new Error("a mirror's dry run needs the dry run's directory");
		}
		const { dir } = cut.dryRun;
		const remotes = `${dir}/remotes`;
		const local = `${remotes}/${this.opts.project.replaceAll("/", "-")}.git`;
		await this.fs.rm(local, { recursive: true, force: true });
		await this.fs.mkdir(remotes);
		await this.git(
			remotes,
			"clone",
			"--bare",
			"--quiet",
			this.opts.remote,
			local,
		);
		return new MirrorStep({
			...this.opts,
			remote: local,
			scratch: `${dir}/mirror-scratch`,
		});
	}

	/**
	 * Writes the whole mirror tree into `mirror`, which is empty but for
	 * `.git`; the workspace root it read from.
	 */
	private async build(cut: Cut, mirror: string): Promise<string> {
		const { project } = this.opts;
		const source = this.opts.source ?? "core";
		const workspace =
			this.opts.workspace ??
			(await ManifestWorkspace.at(cut.root, { fs: this.fs, ps: this.ps }));
		const root = workspace.root;
		const excludes = this.opts.config?.exclude ?? [];
		const keeps = this.opts.config?.keep ?? [];
		const packages = await workspace.packages();
		const own = packages.filter(
			(pkg) =>
				pkg.dir === `${root}/${project}` ||
				pkg.dir.startsWith(`${root}/${project}/`),
		);
		const core = packages.find((pkg) => pkg.name === source);
		if (own.length === 0) {
			throw new Error(`${project} holds no workspace packages to mirror`);
		}
		if (core === undefined) {
			throw new Error(`the workspace has no ${source} package to mirror`);
		}
		const published = await this.checkDependencies(own, core.name, packages);

		const copied = await this.copy(
			`${root}/${project}`,
			mirror,
			(rel) =>
				(this.excluded(AGENT_FILES, rel) && !this.excluded(keeps, rel)) ||
				this.excluded(excludes, `${project}/${rel}`),
		);
		await this.publish(mirror, `${root}/${project}`, own, published);
		await this.replace(mirror);
		await this.rewrite(mirror);

		const catalog = await catalogAt(this.fs, root);
		const used = await this.reached(copied, core);
		const coreOut = `${mirror}/${SOURCE_DIR}/${core.name}`;
		for (const file of used.files) {
			const rel = relative(core.dir, file);
			if (this.excluded(excludes, relative(root, file))) {
				throw new Error(
					`${project} reaches ${relative(root, file)}, which the exclude globs leave out of the mirror`,
				);
			}
			await this.copyFile(file, `${coreOut}/${rel}`);
		}
		for (const extra of ["tsconfig.json", "LICENSE"]) {
			if (await this.fs.exists(`${core.dir}/${extra}`)) {
				await this.copyFile(`${core.dir}/${extra}`, `${coreOut}/${extra}`);
			}
		}
		await this.write(
			`${coreOut}/package.json`,
			await sourceManifest(this.fs, core, {
				keys: used.keys,
				files: used.files,
				catalog,
				version: cut.version,
			}),
		);

		await this.tooling.tsconfigs(mirror, await this.files(mirror));
		await this.rootFiles(root, mirror, own, project, cut.version, catalog);
		return root;
	}

	/**
	 * Refuses a package that needs what the mirror cannot hold. A public
	 * package of another project is no obstacle: the mirror depends on its
	 * published build instead, and its name is returned.
	 */
	private async checkDependencies(
		own: readonly Package[],
		source: string,
		all: readonly Package[],
	): Promise<Map<string, string>> {
		const names = new Set(own.map((pkg) => pkg.name));
		const published = new Map<string, string>();
		for (const pkg of own) {
			const manifest = (await manifestAt(this.fs, pkg.dir)) as Json;
			for (const field of FIELDS) {
				for (const [name, range] of Object.entries(manifest[field] ?? {})) {
					if (NEVER.includes(name)) {
						throw new Error(
							`${pkg.name} depends on ${name}, which is never copied out of the repository`,
						);
					}
					if (
						range.startsWith("workspace:") &&
						name !== source &&
						!names.has(name)
					) {
						const other = all.find((one) => one.name === name);
						if (other === undefined || other.private) {
							throw new Error(
								`${pkg.name} depends on ${name}, which the mirror would not hold`,
							);
						}
						published.set(name, other.dir);
					}
				}
			}
		}
		return published;
	}

	/** Puts each `config.replace` file at the path it stands in for. */
	private async replace(mirror: string): Promise<void> {
		for (const [to, from] of Object.entries(this.opts.config?.replace ?? {})) {
			if (!(await this.fs.exists(`${mirror}/${from}`))) {
				throw new Error(
					`${this.opts.project} replaces ${to} with ${from}, which the mirror does not hold`,
				);
			}
			await this.copyFile(`${mirror}/${from}`, `${mirror}/${to}`);
			await this.fs.rm(`${mirror}/${from}`);
		}
	}

	/** Applies each `config.rewrite` rule to the file it names. */
	private async rewrite(mirror: string): Promise<void> {
		for (const [file, rules] of Object.entries(
			this.opts.config?.rewrite ?? {},
		)) {
			if (!(await this.fs.exists(`${mirror}/${file}`))) {
				throw new Error(
					`${this.opts.project} rewrites ${file}, which the mirror does not hold`,
				);
			}
			let text = await this.fs.read(`${mirror}/${file}`);
			for (const [pattern, to] of rules) {
				const next = text.replace(pattern, to);
				if (next === text) {
					throw new Error(
						`${this.opts.project} rewrites ${file} with ${pattern}, which matches nothing`,
					);
				}
				text = next;
			}
			await this.fs.write(`${mirror}/${file}`, text);
		}
	}

	/**
	 * Points each dependency on a published workspace package at its release
	 * (`^version`, the version that package stands at), in the mirror's copy
	 * of the manifests, since the mirror holds no such package.
	 */
	private async publish(
		mirror: string,
		projectDir: string,
		own: readonly Package[],
		published: ReadonlyMap<string, string>,
	): Promise<void> {
		if (published.size === 0) {
			return;
		}
		// Each is released with its own project, so the range is its own version.
		const versions = new Map<string, string>();
		for (const [name, dir] of published) {
			const manifest = await manifestAt(this.fs, dir);
			versions.set(name, manifest.version ?? "0.0.0");
		}
		for (const pkg of own) {
			const path = join(mirror, relative(projectDir, pkg.dir), "package.json");
			const manifest = JSON.parse(await this.fs.read(path)) as Json;
			for (const field of FIELDS) {
				const deps = manifest[field];
				for (const name of Object.keys(deps ?? {})) {
					const version = versions.get(name);
					if (version !== undefined && deps?.[name]?.startsWith("workspace:")) {
						deps[name] = `^${version}`;
					}
				}
			}
			await this.write(path, manifest);
		}
	}

	/** The `core` entry points the copied source names, and the files they lead to. */
	private async reached(
		copied: readonly string[],
		core: Package,
	): Promise<{ keys: Set<string>; files: Set<string> }> {
		const manifest = await manifestAt(this.fs, core.dir);
		const exported = entries(manifest.exports ?? {});
		const wanted = new Set<string>();
		for (const path of copied) {
			if (!/\.tsx?$/.test(path)) {
				continue;
			}
			for (const specifier of await specifiers(path, this.fs)) {
				if (isPackage(specifier, core.name)) {
					wanted.add(keyOf(core, exported, specifier));
				}
			}
		}
		return reach(this.fs, core, [...wanted]);
	}

	/**
	 * What the mirror's root holds that no project folder does: the manifest
	 * naming the workspaces and the catalog entries used, the base tsconfig,
	 * the toolchain the root pins, the lint config and a gitignore.
	 */
	private async rootFiles(
		root: string,
		mirror: string,
		own: readonly Package[],
		project: string,
		version: string,
		catalog: Record<string, string>,
	): Promise<void> {
		const rootManifest = (await manifestAt(this.fs, root)) as Json;
		const devDependencies = Object.fromEntries(
			Object.entries(rootManifest.devDependencies ?? {}).filter(
				([name]) => !NEVER.includes(name),
			),
		);
		const manifests: Json[] = [{ devDependencies }];
		for (const pkg of own) {
			manifests.push(
				(await manifestAt(
					this.fs,
					join(mirror, relative(`${root}/${project}`, pkg.dir)),
				)) as Json,
			);
		}
		const used: Record<string, string> = {};
		for (const manifest of manifests) {
			for (const field of FIELDS) {
				for (const [name, range] of Object.entries(manifest[field] ?? {})) {
					if (range.startsWith("catalog:")) {
						const resolved = catalog[name];
						if (resolved === undefined) {
							throw new Error(`${name} is ${range}, which the catalog lacks`);
						}
						used[name] = resolved;
					}
				}
			}
		}
		const dirs = own.map((pkg) => relative(`${root}/${project}`, pkg.dir));
		const workspaces = {
			packages: [
				...dirs.filter((one) => one !== "").toSorted(),
				`${SOURCE_DIR}/${this.opts.source ?? "core"}`,
			],
			catalog: used,
		};
		// A package mirrored on its own stands at the root, so its manifest is
		// the root's too, and carries the workspace beside its own fields.
		const scripts = this.opts.config?.scripts;
		const top = dirs.includes("")
			? (JSON.parse(await this.fs.read(`${mirror}/package.json`)) as Json)
			: undefined;
		await this.write(
			`${mirror}/package.json`,
			top === undefined
				? {
						name: project,
						version,
						private: true,
						type: "module",
						workspaces,
						devDependencies,
						...(scripts === undefined ? {} : { scripts }),
					}
				: {
						...top,
						workspaces,
						devDependencies: { ...devDependencies, ...top.devDependencies },
						...(scripts === undefined
							? {}
							: { scripts: { ...top.scripts, ...scripts } }),
					},
		);
		await this.copyFile(
			`${root}/tsconfig.base.json`,
			`${mirror}/tsconfig.base.json`,
		);
		await this.tooling.bunfig(root, mirror);
		await this.tooling.lint(
			root,
			mirror,
			`${SOURCE_DIR}/${this.opts.source ?? "core"}`,
		);
		await this.tooling.gitignore(root, mirror);
	}

	/** Every file under `dir`, dotfiles included. */
	private async files(dir: string): Promise<string[]> {
		const found: string[] = [];
		for (const entry of await this.fs.readdir(dir)) {
			if (SKIPPED.has(entry)) {
				continue;
			}
			const path = `${dir}/${entry}`;
			if ((await this.fs.stat(path)).isDirectory()) {
				found.push(...(await this.files(path)));
			} else {
				found.push(path);
			}
		}
		return found.toSorted();
	}

	/** Copies `from` to `to` but for what `skip` names, by path relative to `from`; the paths written. */
	private async copy(
		from: string,
		to: string,
		skip: (rel: string) => boolean,
	): Promise<string[]> {
		const copied: string[] = [];
		for (const path of await this.files(from)) {
			const rel = relative(from, path);
			if (skip(rel)) {
				continue;
			}
			await this.copyFile(path, `${to}/${rel}`);
			copied.push(`${to}/${rel}`);
		}
		return copied;
	}

	private async copyFile(from: string, to: string): Promise<void> {
		await this.fs.mkdir(dirname(to));
		await this.fs.writeBytes(to, await this.fs.readBytes(from));
		const { mode } = await this.fs.stat(from);
		if ((mode & 0o111) !== 0) {
			await this.fs.chmod(to, mode & 0o777);
		}
	}

	private async write(path: string, value: object): Promise<void> {
		await this.fs.mkdir(dirname(path));
		await this.fs.write(path, `${JSON.stringify(value, null, "\t")}\n`);
	}

	private excluded(globs: readonly string[], rel: string): boolean {
		return globs.some((glob) => this.glob.matches(glob, rel));
	}

	/** Whether the remote has `tag`. */
	private async tagged(mirror: string, tag: string): Promise<boolean> {
		const found = await this.git(
			mirror,
			"ls-remote",
			"--tags",
			"origin",
			`refs/tags/${tag}`,
		);
		return found.trim() !== "";
	}

	/** Checks out `branch`, from the remote's when it has one and as a new branch when not. */
	private async checkout(mirror: string, branch: string): Promise<void> {
		const has = await this.ps.spawnCapture(
			["git", "rev-parse", "--verify", "--quiet", `origin/${branch}`],
			{ cwd: mirror },
		);
		if (has.exitCode === 0) {
			await this.git(mirror, "checkout", "-B", branch, `origin/${branch}`);
		} else {
			await this.git(mirror, "checkout", "-B", branch);
		}
	}

	private async git(cwd: string, ...args: string[]): Promise<string> {
		const result = await this.ps.spawnCapture(["git", ...args], { cwd });
		if (result.exitCode !== 0) {
			throw new Error(
				`git ${args.join(" ")} failed in ${cwd}: ${result.stderr.trim()}`,
			);
		}
		return result.stdout;
	}
}
