import { dirname, join, relative } from "node:path";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";

/** What a mirror is written from and to. */
export interface MirrorOptions {
	/** mono's root. */
	root: string;
	/** The published package's folder, relative to `root`, as `mdom/packages/mdom`. */
	package: string;
	/** The mirror's checkout; everything but `.git` and `.github` is replaced. */
	into: string;
	/** The version the published package and the mirror's manifests take. */
	version: string;
	/**
	 * Globs, relative to the project folder, of paths the mirror otherwise
	 * leaves out and should carry, as `skills/vexml/**`.
	 */
	keep?: readonly string[];
	/** The version npm has of a package; asks npm by default. */
	published?: (name: string) => Promise<string>;
	/** Versions to depend on in place of npm's, by package name. */
	pins?: Record<string, string>;
	fs?: Fs;
	ps?: Ps;
}

/**
 * Writes a project's public repository: the project folder at the root, the
 * `core` folders it reaches under `packages/core`, and the root tooling it
 * would otherwise inherit from mono, at `version`. Imports stay as they are:
 * `core/...` resolves to the copy in the mirror's workspace. A `workspace:`
 * dependency on a package outside the mirror takes the version npm has.
 * A project's `mirror/` folder, when it has one, is laid over the mirror's
 * root after the copy and is not copied itself.
 * Returns the folder the package sits in, relative to the mirror's root.
 */
export async function writeMirror(opts: MirrorOptions): Promise<string> {
	const fs = opts.fs ?? new NodeFs();
	const ps = opts.ps ?? new NodePs();
	const lookup = opts.published ?? ((name: string) => published(ps, name));
	const publishedVersion = async (name: string) =>
		opts.pins?.[name] ?? (await lookup(name));
	const project = opts.package.split("/")[0] as string;
	const tracked = await gitFiles(ps, opts.root, [
		project,
		"core/packages/core",
	]);

	await clear(fs, opts.into);

	const keeps = (opts.keep ?? []).map((glob) => new Bun.Glob(glob));
	const own = tracked
		.filter((path) => path.startsWith(`${project}/`))
		.map((path) => path.slice(project.length + 1));
	const overlay = own
		.filter((path) => path.startsWith(`${OVERLAY}/`))
		.map((path) => path.slice(OVERLAY.length + 1));
	const projectFiles = [
		...own
			.filter((path) => !path.startsWith(`${OVERLAY}/`))
			.filter(
				(path) =>
					!LEFT_OUT.some((rule) => rule.test(path)) ||
					keeps.some((glob) => glob.match(path)),
			)
			.filter((path) => !overlay.includes(path)),
		...overlay,
	];
	for (const path of projectFiles) {
		await copy(
			fs,
			join(
				opts.root,
				project,
				overlay.includes(path) ? `${OVERLAY}/${path}` : path,
			),
			join(opts.into, path),
		);
	}

	const coreRoot = "core/packages/core";
	const coreFiles = tracked
		.filter((path) => path.startsWith(`${coreRoot}/`))
		.map((path) => path.slice(coreRoot.length + 1));
	const folders = await coreReach(
		fs,
		join(opts.root, coreRoot),
		coreFiles,
		projectFiles
			.filter((path) => /\.tsx?$/.test(path))
			.map((path) => join(opts.into, path)),
	);
	const copiedCore = coreFiles.filter(
		(path) =>
			!CORE_LEFT_OUT.test(path) &&
			(folders.has(path.split("/")[0] as string) ||
				(!path.includes("/") && !/\.tsx?$/.test(path))),
	);
	for (const path of copiedCore) {
		if (path === "package.json") {
			continue;
		}
		await copy(
			fs,
			join(opts.root, coreRoot, path),
			join(opts.into, "packages/core", path),
		);
	}

	const rootManifest = await readJson(fs, join(opts.root, "package.json"));
	const coreManifest = await readJson(
		fs,
		join(opts.root, coreRoot, "package.json"),
	);
	const imported = await importsOf(
		fs,
		copiedCore
			.filter((path) => /\.tsx?$/.test(path))
			.map((path) => join(opts.into, "packages/core", path)),
	);
	await writeJson(fs, join(opts.into, "packages/core/package.json"), {
		...coreManifest,
		version: opts.version,
		exports: Object.fromEntries(
			Object.entries(coreManifest.exports ?? {}).filter(([key]) =>
				folders.has(key.replace(/^\.\//, "").split("/")[0] as string),
			),
		),
		...Object.fromEntries(
			(
				[
					"dependencies",
					"peerDependencies",
					"peerDependenciesMeta",
					"devDependencies",
				] as const
			).map((field) => [
				field,
				Object.fromEntries(
					Object.entries(coreManifest[field] ?? {}).filter(([name]) =>
						imported.has(name),
					),
				),
			]),
		),
	});

	const packages: string[] = [];
	for (const path of projectFiles) {
		if (/^packages\/[^/]+\/package\.json$/.test(path)) {
			packages.push(dirname(path));
		}
	}
	packages.push("packages/core");
	const catalog = rootManifest.workspaces?.catalog ?? {};
	const used = new Set<string>();
	for (const dir of packages) {
		const path = join(opts.into, dir, "package.json");
		const manifest = await readJson(fs, path);
		for (const field of [
			"dependencies",
			"devDependencies",
			"peerDependencies",
		] as const) {
			for (const [name, range] of Object.entries(manifest[field] ?? {})) {
				if (range.startsWith("catalog:")) {
					used.add(name);
				} else if (
					range.startsWith("workspace:") &&
					name !== "core" &&
					!(await workspaceIn(fs, opts.into, packages, name))
				) {
					(manifest[field] as Record<string, string>)[name] =
						`^${await publishedVersion(name)}`;
				}
			}
		}
		if (dir === relative(project, opts.package)) {
			manifest.version = opts.version;
		}
		await writeJson(fs, path, manifest);
		await rebase(fs, opts.into, dir);
	}
	const tools: Record<string, string> = {};
	for (const name of ROOT_TOOLS) {
		const range = rootManifest.devDependencies?.[name];
		if (range !== undefined) {
			tools[name] = range;
			if (range.startsWith("catalog:")) {
				used.add(name);
			}
		}
	}
	await writeJson(fs, join(opts.into, "package.json"), {
		name: project,
		version: opts.version,
		private: true,
		type: "module",
		workspaces: {
			packages,
			catalog: Object.fromEntries(
				Object.entries(catalog).filter(([name]) => used.has(name)),
			),
		},
		devDependencies: tools,
	});

	for (const file of ROOT_FILES) {
		const from = join(opts.root, file);
		if ((await fs.exists(from)) && !(await fs.exists(join(opts.into, file)))) {
			await copy(fs, from, join(opts.into, file));
		}
	}
	await writeBiome(fs, opts.root, opts.into);
	return relative(project, opts.package);
}

/**
 * The top-level core folders the sources reach, following core's own
 * imports of itself, with what the publish workflow runs.
 */
async function coreReach(
	fs: Fs,
	coreDir: string,
	coreFiles: string[],
	sources: string[],
): Promise<Set<string>> {
	const folders = new Set<string>();
	const queue = [...PUBLISH_CORE];
	for (const specifier of await importsOf(fs, sources)) {
		if (specifier.startsWith("core/")) {
			queue.push(specifier.split("/")[1] as string);
		}
	}
	while (queue.length > 0) {
		const folder = queue.pop() as string;
		if (folders.has(folder)) {
			continue;
		}
		folders.add(folder);
		const files = coreFiles
			.filter(
				(path) =>
					path.startsWith(`${folder}/`) &&
					/\.tsx?$/.test(path) &&
					!CORE_LEFT_OUT.test(path),
			)
			.map((path) => join(coreDir, path));
		for (const specifier of await importsOf(fs, files)) {
			if (specifier.startsWith("core/")) {
				queue.push(specifier.split("/")[1] as string);
			}
		}
	}
	return folders;
}

/**
 * Every specifier the files import, with a bare package's subpath cut to the
 * package's name (`@scope/name/sub` to `@scope/name`) beside it as written.
 */
async function importsOf(fs: Fs, files: string[]): Promise<Set<string>> {
	const found = new Set<string>();
	for (const file of files) {
		for (const match of (await fs.read(file)).matchAll(SPECIFIER)) {
			const specifier = match[1] as string;
			found.add(specifier);
			if (!specifier.startsWith(".")) {
				const parts = specifier.split("/");
				found.add(
					specifier.startsWith("@")
						? parts.slice(0, 2).join("/")
						: (parts[0] as string),
				);
			}
		}
	}
	return found;
}

/** Whether a package of the mirror's workspace is named `name`. */
async function workspaceIn(
	fs: Fs,
	into: string,
	packages: string[],
	name: string,
): Promise<boolean> {
	for (const dir of packages) {
		if ((await readJson(fs, join(into, dir, "package.json"))).name === name) {
			return true;
		}
	}
	return false;
}

/** The version npm has of `name`, which a mirror depends on in place of mono's. */
async function published(ps: Ps, name: string): Promise<string> {
	const result = await ps.spawnCapture(["npm", "view", name, "version"]);
	const version = result.stdout.trim();
	if (result.exitCode !== 0 || !version) {
		throw new Error(
			`The mirror depends on ${name}, which npm does not have: ship it first`,
		);
	}
	return version;
}

/**
 * Points a package's `tsconfig.json` that extends mono's root
 * `tsconfig.base.json` at the mirror's own.
 */
async function rebase(fs: Fs, into: string, dir: string): Promise<void> {
	const path = join(into, dir, "tsconfig.json");
	if (!(await fs.exists(path))) {
		return;
	}
	const depth = dir.split("/").length;
	const text = await fs.read(path);
	const rebased = text.replace(
		/"extends":\s*"(?:\.\.\/)+tsconfig\.base\.json"/,
		`"extends": "${"../".repeat(depth)}tsconfig.base.json"`,
	);
	if (rebased !== text) {
		await fs.write(path, rebased);
	}
}

/**
 * mono's `biome.json` with the project's laid over it, as the mirror's root
 * config, since the project's extends a root the mirror does not have.
 */
async function writeBiome(fs: Fs, root: string, into: string): Promise<void> {
	const base = join(root, "biome.json");
	if (!(await fs.exists(base))) {
		return;
	}
	const own = join(into, "biome.json");
	const merged = merge(
		await readJson(fs, base),
		(await fs.exists(own)) ? await readJson(fs, own) : {},
	);
	delete merged.root;
	delete merged.extends;
	await writeJson(fs, own, merged);
}

/** `over` laid on `base`: objects merge key by key, anything else is replaced. */
function merge(
	base: Record<string, unknown>,
	over: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(over)) {
		const under = out[key];
		out[key] = isObject(under) && isObject(value) ? merge(under, value) : value;
	}
	return out;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The files git tracks under each folder, relative to `root`. */
async function gitFiles(
	ps: Ps,
	root: string,
	folders: string[],
): Promise<string[]> {
	const result = await ps.spawnCapture(
		["git", "ls-files", "-z", "--", ...folders],
		{ cwd: root },
	);
	if (result.exitCode !== 0) {
		throw new Error(`git ls-files failed: ${result.stderr.trim()}`);
	}
	return result.stdout.split("\0").filter(Boolean);
}

/** Empties `dir` but for `.git` and `.github`, creating it when missing. */
async function clear(fs: Fs, dir: string): Promise<void> {
	await fs.mkdir(dir, { recursive: true });
	for (const entry of await fs.readdir(dir)) {
		if (entry !== ".git" && entry !== ".github") {
			await fs.rm(join(dir, entry), { recursive: true, force: true });
		}
	}
}

async function copy(fs: Fs, from: string, to: string): Promise<void> {
	await fs.mkdir(dirname(to), { recursive: true });
	await fs.writeBytes(to, await fs.readBytes(from));
	await fs.chmod(to, (await fs.stat(from)).mode & 0o777);
}

async function readJson(fs: Fs, path: string): Promise<Manifest> {
	return JSON.parse(await fs.read(path));
}

async function writeJson(fs: Fs, path: string, value: unknown): Promise<void> {
	await fs.write(path, `${JSON.stringify(value, null, "\t")}\n`);
}

/**
 * Only helps agents or mono's own checks, so never leaves mono. Matched
 * against each path relative to the project folder.
 */
const LEFT_OUT = [
	/(^|\/)AGENTS\.md$/,
	/(^|\/)CLAUDE\.md$/,
	/(^|\/)SPLATES\.md$/,
	/(^|\/)\.claude\//,
	/(^|\/)\.agents\//,
	/(^|\/)\.vet\//,
	/(^|\/)vet\.config\.ts$/,
	/(^|\/)\.scry\//,
	/(^|\/)scry\.config\.ts$/,
	/^skills\//,
	/^splates\.config\.ts$/,
];

/** The project folder whose files are laid over the mirror's root. */
const OVERLAY = "mirror";

/** A core file that is not part of what a package reaching it runs. */
const CORE_LEFT_OUT = /(\.test\.tsx?$|(^|\/)fixtures\/)/;

/** The root tooling a mirror carries, since it has no mono root above it. */
const ROOT_FILES = ["tsconfig.base.json", "bunfig.toml", ".gitignore"];

/** Root dev dependencies the mirror keeps, the rest being mono's own tools. */
const ROOT_TOOLS = ["@biomejs/biome", "@types/bun", "typescript"];

/** Specifiers a file imports or re-exports, static or dynamic. */
const SPECIFIER =
	/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"'\s]+)["']/g;

/**
 * The core folders the mirror always carries, beside those the project
 * reaches: what the publish workflow runs.
 */
export const PUBLISH_CORE = ["ship"];

type Manifest = {
	name?: string;
	version?: string;
	private?: boolean;
	exports?: Record<string, unknown>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, unknown>;
	workspaces?: { packages?: string[]; catalog?: Record<string, string> };
	[key: string]: unknown;
};
