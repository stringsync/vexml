import { dirname, join } from "node:path";
import type { Fs } from "core/system";

/**
 * The private workspace packages a build of `own` must carry in itself,
 * since npm has none of them: those it depends on, however deep.
 */
export function bundledOf(
	own: Manifest,
	members: Map<string, Member>,
): Set<string> {
	const bundled = new Set<string>();
	const queue = [own];
	while (queue.length > 0) {
		const manifest = queue.pop() as Manifest;
		for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
			const member = members.get(name);
			if (
				range.startsWith("workspace:") &&
				member?.manifest.private &&
				!bundled.has(name)
			) {
				bundled.add(name);
				queue.push(member.manifest);
			}
		}
	}
	return bundled;
}

/**
 * Reads a mirror's workspace and copies a package's files out of it, for a
 * build: `members` finds its packages, `list` the files of one, `copy` and
 * `manifest` do what they say.
 */
export class PackageFiles {
	constructor(private readonly fs: Fs) {}

	/** The workspace's packages by name, from its root manifest. */
	async members(
		root: string,
		manifest: Manifest,
	): Promise<Map<string, Member>> {
		const members = new Map<string, Member>();
		for (const dir of manifest.workspaces?.packages ?? []) {
			const path = join(root, dir, "package.json");
			if (await this.fs.exists(path)) {
				const member = await this.manifest(path);
				members.set(member.name, { dir: join(root, dir), manifest: member });
			}
		}
		return members;
	}

	/** Every file under `dir`, relative to it, but for `node_modules` and a top `dist`. */
	async list(dir: string, prefix = ""): Promise<string[]> {
		const files: string[] = [];
		for (const entry of await this.fs.readdir(join(dir, prefix))) {
			const path = prefix ? `${prefix}/${entry}` : entry;
			if (entry === "node_modules" || path === "dist") {
				continue;
			}
			if ((await this.fs.stat(join(dir, path))).isDirectory()) {
				files.push(...(await this.list(dir, path)));
			} else {
				files.push(path);
			}
		}
		return files;
	}

	async copy(from: string, to: string): Promise<void> {
		await this.fs.mkdir(dirname(to), { recursive: true });
		await this.fs.writeBytes(to, await this.fs.readBytes(from));
	}

	async manifest(path: string): Promise<Manifest> {
		return JSON.parse(await this.fs.read(path));
	}
}

export type Exports = string | { [key: string]: Exports };

export type Manifest = {
	name: string;
	version?: string;
	private?: boolean;
	exports?: Exports;
	bin?: string | Record<string, string>;
	files?: string[];
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
	workspaces?: { packages?: string[]; catalog?: Record<string, string> };
	[field: string]: unknown;
};

export type Member = { dir: string; manifest: Manifest };

/** A TypeScript source file. */
export const SOURCE = /\.tsx?$/;

/**
 * Private workspace packages of other projects that a release folds in, by
 * package name: each is copied into the mirror and bundled into the build,
 * with what its code reads from disk beside the built code.
 */
export type Fold = Record<string, FoldedPackage>;

export interface FoldedPackage {
	/**
	 * Globs, relative to the package, of files its code reads from disk
	 * beside `import.meta.dir`, which in a build is the folder the built code
	 * sits in. A glob with a `*` keeps its path under `dist/` (`extension/**`
	 * lands at `dist/extension/...`); a literal path lands at its file name
	 * (`control/index.html` at `dist/index.html`), as its reader looks beside
	 * itself.
	 */
	files?: string[];
	/**
	 * Files, relative to the package, its code builds itself for the browser:
	 * each is built beside the files, as `control/main.tsx` into `main.js`.
	 */
	entries?: string[];
}

/** The file in a mirror's root that carries its fold to the build. */
export const FOLD_FILE = "ship-fold.json";
