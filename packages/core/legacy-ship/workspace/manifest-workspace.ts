import { dirname } from "node:path";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";
import type { Package, Workspace } from "./workspace";

interface Manifest {
	name?: string;
	version?: string;
	private?: boolean;
	workspaces?: string[] | { packages?: string[] };
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	repository?: string | { url?: string };
}

/**
 * The package.json files a release reads and stamps. One version covers the
 * whole workspace, and the root manifest is where it lives.
 */
/**
 * What a `ManifestWorkspace` reads through and spawns `bun` with; the real
 * filesystem and process by default.
 */
export interface ManifestWorkspaceOptions {
	/**
	 * A top-level folder of the workspace root to narrow the workspace to: only
	 * its packages are listed and stamped, and its version is theirs, since the
	 * root manifest of a repository holding many projects has none. The root
	 * stays the repository's.
	 */
	project?: string;
	fs?: Fs;
	ps?: Ps;
}

export class ManifestWorkspace implements Workspace {
	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly project: string | undefined;

	constructor(
		/** The directory whose package.json declares the workspaces. */
		readonly root: string,
		opts: ManifestWorkspaceOptions = {},
	) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.project = opts.project;
	}

	/**
	 * Finds the workspace `from` sits in, climbing until a manifest claims one.
	 * A repo holding a single package declares no workspaces, so when nothing
	 * above claims any, the nearest named manifest is a workspace of one.
	 */
	static async at(
		from: string,
		opts: ManifestWorkspaceOptions = {},
	): Promise<ManifestWorkspace> {
		const fs = opts.fs ?? new NodeFs();
		let single: string | null = null;
		for (let dir = from; ; dir = dirname(dir)) {
			const manifest = await read(fs, dir);
			if (manifest?.workspaces !== undefined) {
				return new ManifestWorkspace(dir, { ...opts, fs });
			}
			if (single === null && manifest?.name !== undefined) {
				single = dir;
			}
			if (dirname(dir) === dir) {
				if (single === null) {
					throw new Error(`no workspace above ${from}`);
				}
				return new ManifestWorkspace(single, { ...opts, fs });
			}
		}
	}

	/** The version every package in the workspace, or its project, shares. */
	async version(): Promise<string> {
		if (this.project !== undefined) {
			for (const dir of await this.dirs()) {
				const version = (await read(this.fs, dir))?.version;
				if (version !== undefined) {
					return version;
				}
			}
			return "0.0.0";
		}
		return (await this.manifest()).version ?? "0.0.0";
	}

	async packages(): Promise<Package[]> {
		const found: Array<{ dir: string; manifest: Manifest & { name: string } }> =
			[];
		for (const dir of await this.dirs()) {
			const manifest = await read(this.fs, dir);
			if (manifest?.name !== undefined) {
				found.push({ dir, manifest: { ...manifest, name: manifest.name } });
			}
		}
		// Which names are siblings is only knowable once every manifest is read,
		// so the dependency lists are narrowed to the workspace in a second pass.
		const names = new Set(found.map((one) => one.manifest.name));
		return found
			.map(({ dir, manifest }) => ({
				name: manifest.name,
				dir,
				private: manifest.private === true,
				// Peers count and devDependencies do not: a consumer installing this
				// package gets its peers resolved and never sees what tested it.
				dependencies: Object.keys({
					...manifest.dependencies,
					...manifest.peerDependencies,
				}).filter((dep) => names.has(dep)),
				...repositoryOf(manifest),
			}))
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	/**
	 * Stamps `version` into every package, `bun.lock`, and the root manifest,
	 * in lockstep. The root goes last, because it is the version a
	 * release reads: stamping it first would leave a run that died partway
	 * reading as the version it never finished, and send the next one past it.
	 */
	async setVersion(version: string): Promise<void> {
		// A workspace of one is its root, which is stamped once, last.
		const dirs = (await this.dirs()).filter((dir) => dir !== this.root);
		for (const dir of dirs) {
			await this.stamp(dir, version);
		}
		await this.lock();
		if (this.project === undefined) {
			await this.stamp(this.root, version);
		}
	}

	private async dirs(): Promise<string[]> {
		const declared = (await this.manifest()).workspaces;
		// bun accepts the list directly or under `packages`, beside a catalog.
		const workspaces = Array.isArray(declared) ? declared : declared?.packages;
		if (workspaces === undefined) {
			return [this.root]; // no workspaces declared: the root is the one package
		}
		const dirs: string[] = [];
		for (const pattern of workspaces) {
			dirs.push(...(await this.expand(this.root, pattern.split("/"))));
		}
		if (this.project === undefined) {
			// A public package can stand at the root beside its workspaces, as a
			// mirror of one package lays it out; a private root only holds them.
			const root = await this.manifest();
			const published = root.name !== undefined && root.private !== true;
			return published && !dirs.includes(this.root)
				? [this.root, ...dirs]
				: dirs;
		}
		return dirs.filter((dir) =>
			dir.startsWith(`${this.root}/${this.project}/`),
		);
	}

	/**
	 * The paths under `dir` that `segments` name, a `*` segment standing for
	 * every entry at that level, as in `packages/*` or `*\/packages/*`.
	 */
	// ponytail: only whole-segment `*`, which is all any repo here writes.
	// Reach for a glob library when one of them needs `**` or `pkg-*`.
	private async expand(dir: string, segments: string[]): Promise<string[]> {
		const [head, ...rest] = segments;
		if (head === undefined) {
			return [dir];
		}
		if (head !== "*") {
			return this.expand(`${dir}/${head}`, rest);
		}
		const found: string[] = [];
		for (const entry of await this.fs.readdir(dir).catch(() => [])) {
			found.push(...(await this.expand(`${dir}/${entry}`, rest)));
		}
		return found;
	}

	/**
	 * Brings `bun.lock` up to the versions just stamped, as the next
	 * `bun install` would; left behind, that install dirties the tree the
	 * release just committed. bun writes it, so its format stays bun's business.
	 */
	private async lock(): Promise<void> {
		if (!(await this.fs.exists(`${this.root}/bun.lock`))) {
			return;
		}
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture(
			["bun", "install", "--lockfile-only"],
			{ cwd: this.root },
		);
		if (exitCode !== 0) {
			throw new Error(
				`bun install --lockfile-only: ${stderr.trim() || stdout.trim()}`,
			);
		}
	}

	private async manifest(): Promise<Manifest> {
		return (await read(this.fs, this.root)) ?? {};
	}

	private async stamp(dir: string, version: string): Promise<void> {
		const path = `${dir}/package.json`;
		const manifest = await read(this.fs, dir);
		if (manifest === null) {
			return;
		}
		manifest.version = version;
		await this.fs.write(path, `${JSON.stringify(manifest, null, "\t")}\n`);
	}
}

/** Null covers both "no manifest here" and "one no parser would take". */
async function read(fs: Fs, dir: string): Promise<Manifest | null> {
	try {
		return JSON.parse(await fs.read(`${dir}/package.json`));
	} catch {
		return null;
	}
}

/** The manifest's repository URL, written either way npm takes it. */
function repositoryOf(manifest: Manifest): { repository?: string } {
	const { repository } = manifest;
	const url = typeof repository === "string" ? repository : repository?.url;
	return url === undefined ? {} : { repository: url };
}
