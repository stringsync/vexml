import { builtinModules } from "node:module";
import { join, relative } from "node:path";
import {
	type Fs,
	type Glob,
	NodeFs,
	NodeGlob,
	NodePs,
	type Ps,
} from "core/system";
import { emitDeclarations, SPECIFIER } from "./declarations";
import {
	bundledOf,
	type Exports,
	type Manifest,
	type Member,
	PackageFiles,
	SOURCE,
} from "./workspace";

/** What a package is built from, and the system it builds with. */
export interface BuildOptions {
	/** The mirror's root, whose workspace holds the package. */
	root: string;
	/** The package's folder, relative to `root`, as `packages/mdom`. */
	package: string;
	fs?: Fs;
	ps?: Ps;
	glob?: Glob;
}

/**
 * Builds the package into `dist/`, a whole package npm can take as it is:
 * JavaScript for every entry point, with `core` and any private package of
 * the workspace bundled in, since npm has neither; declarations beside it,
 * pointed at each other rather than at those packages; the files the
 * manifest's `files` names; and a manifest of its own whose dependencies are
 * what the output imports. Returns `dist`'s path.
 */
export async function build(opts: BuildOptions): Promise<string> {
	const fs = opts.fs ?? new NodeFs();
	const ps = opts.ps ?? new NodePs();
	const glob = opts.glob ?? new NodeGlob();
	const dir = join(opts.root, opts.package);
	const out = join(dir, "dist");
	const files = new PackageFiles(fs);
	const rootManifest = await files.manifest(join(opts.root, "package.json"));
	const members = await files.members(opts.root, rootManifest);
	const own = await files.manifest(join(dir, "package.json"));
	if (!own.version) {
		throw new Error(`${own.name} has no version to publish`);
	}
	const bundled = bundledOf(own, members);
	const ranges = rangesOf(
		[own, ...[...bundled].map((name) => members.get(name)?.manifest)],
		members,
		rootManifest.workspaces?.catalog ?? {},
	);

	await fs.rm(out, { recursive: true, force: true });
	const entries = sources(own);
	if (entries.length > 0) {
		const externals = [...ranges.keys()].flatMap((name) => [
			"--external",
			name,
			"--external",
			`${name}/*`,
		]);
		await run(ps, dir, [
			"bun",
			"build",
			...entries,
			"--outdir",
			"dist",
			"--root",
			".",
			"--target",
			"node",
			"--format",
			"esm",
			"--splitting",
			...externals,
		]);
		const ambient = (await fs.readdir(dir))
			.filter((entry) => entry.endsWith(".d.ts"))
			.map((entry) => join(opts.package, entry));
		await emitDeclarations({
			fs,
			root: opts.root,
			package: opts.package,
			files: [...entries.map((entry) => join(opts.package, entry)), ...ambient],
			bundled,
			members,
			tsc: (config) => run(ps, opts.root, ["bun", "x", "tsc", "-p", config]),
		});
	}

	const folder = relative(join(opts.root, "packages"), dir);
	const published: Manifest = { name: own.name };
	for (const [field, value] of Object.entries(own)) {
		if (!LOCAL.has(field)) {
			published[field] = value;
		}
	}
	published.type = "module";
	if (own.exports !== undefined) {
		const exports = builtExports(own.exports, folder);
		published.exports = exports;
		const main = typeof exports === "string" ? undefined : exports["."];
		if (main !== undefined && typeof main !== "string") {
			published.main = main.default as string;
			published.types = main.types as string;
		}
		for (const path of plainFiles(own.exports)) {
			await files.copy(join(dir, path), join(out, path));
		}
	}
	if (own.bin !== undefined) {
		published.bin =
			typeof own.bin === "string"
				? js(own.bin)
				: Object.fromEntries(
						Object.entries(own.bin).map(([name, path]) => [name, js(path)]),
					);
	}
	for (const pattern of own.files ?? []) {
		for (const path of await files.list(dir)) {
			if (glob.matches(pattern, path)) {
				await files.copy(join(dir, path), join(out, path));
			}
		}
	}
	for (const doc of DOCS) {
		const from = (await fs.exists(join(dir, doc)))
			? join(dir, doc)
			: join(opts.root, doc);
		if (await fs.exists(from)) {
			await files.copy(from, join(out, doc));
		}
	}

	const imported = await importedPackages(fs, files, out);
	for (const name of [...imported]) {
		// What the declarations import needs its types, when they come apart.
		const types = `@types/${name.replace(/^@/, "").replace("/", "__")}`;
		if (ranges.has(types)) {
			imported.add(types);
		}
	}
	const dependencies: Record<string, string> = {};
	const peers: Record<string, string> = {};
	const peerMeta: Record<string, { optional: boolean }> = {};
	for (const name of [...imported].sort()) {
		const range = ranges.get(name);
		if (range === undefined) {
			throw new Error(
				`The build of ${own.name} imports ${name}, which no package it bundles depends on`,
			);
		}
		if (range.peer) {
			peers[name] = range.range;
			if (range.optional) {
				peerMeta[name] = { optional: true };
			}
		} else {
			dependencies[name] = range.range;
		}
	}
	if (Object.keys(dependencies).length > 0) {
		published.dependencies = dependencies;
	}
	if (Object.keys(peers).length > 0) {
		published.peerDependencies = peers;
	}
	if (Object.keys(peerMeta).length > 0) {
		published.peerDependenciesMeta = peerMeta;
	}
	await fs.mkdir(out, { recursive: true });
	await fs.write(
		join(out, "package.json"),
		`${JSON.stringify(published, null, "\t")}\n`,
	);
	return out;
}

type Range = { range: string; peer: boolean; optional: boolean };

/**
 * The range each package the build may import is published under, from the
 * first manifest declaring it: catalog ranges resolved, and a public
 * workspace sibling at its own version.
 */
function rangesOf(
	manifests: (Manifest | undefined)[],
	members: Map<string, Member>,
	catalog: Record<string, string>,
): Map<string, Range> {
	const ranges = new Map<string, Range>();
	const resolve = (name: string, range: string): string | undefined => {
		if (range.startsWith("catalog:")) {
			return catalog[name];
		}
		if (range.startsWith("workspace:")) {
			const member = members.get(name)?.manifest;
			return member && !member.private && member.version
				? `^${member.version}`
				: undefined;
		}
		return range;
	};
	for (const manifest of manifests) {
		if (!manifest) {
			continue;
		}
		for (const [peer, field] of [
			[false, manifest.dependencies],
			[true, manifest.peerDependencies],
		] as const) {
			for (const [name, range] of Object.entries(field ?? {})) {
				const resolved = resolve(name, range);
				if (resolved !== undefined && !ranges.has(name)) {
					ranges.set(name, {
						range: resolved,
						peer,
						optional: Boolean(
							peer && manifest.peerDependenciesMeta?.[name]?.optional,
						),
					});
				}
			}
		}
	}
	return ranges;
}

/** The TypeScript files the manifest's exports and bin name. */
function sources(manifest: Manifest): string[] {
	const found = new Set<string>();
	const gather = (entry: Exports | undefined): void => {
		if (entry === undefined) {
			return;
		}
		if (typeof entry === "string") {
			if (SOURCE.test(entry)) {
				found.add(entry);
			}
			return;
		}
		for (const value of Object.values(entry)) {
			gather(value);
		}
	};
	gather(manifest.exports);
	gather(manifest.bin);
	return [...found];
}

/** The files the exports name that are not TypeScript, copied as they are. */
function plainFiles(exports: Exports): string[] {
	if (typeof exports === "string") {
		return SOURCE.test(exports) ? [] : [exports];
	}
	return Object.values(exports).flatMap(plainFiles);
}

/** The exports pointing at the build: JavaScript, and declarations under `types`. */
function builtExports(exports: Exports, folder: string): Exports {
	if (typeof exports === "string") {
		if (!SOURCE.test(exports)) {
			return exports;
		}
		return {
			types: `./${join("types", folder, exports.replace(SOURCE, ".d.ts"))}`,
			default: js(exports),
		};
	}
	return Object.fromEntries(
		Object.entries(exports).map(([key, value]) => [
			key,
			builtExports(value, folder),
		]),
	);
}

function js(path: string): string {
	return `./${join(".", path.replace(SOURCE, ".js"))}`;
}

/** Every package the built JavaScript and declarations import by name. */
async function importedPackages(
	fs: Fs,
	files: PackageFiles,
	out: string,
): Promise<Set<string>> {
	const names = new Set<string>();
	if (!(await fs.exists(out))) {
		return names;
	}
	for (const path of await files.list(out)) {
		if (!/\.(js|d\.ts)$/.test(path)) {
			continue;
		}
		for (const match of (await fs.read(join(out, path))).matchAll(SPECIFIER)) {
			const specifier = match[2] as string;
			if (
				specifier.startsWith(".") ||
				specifier.startsWith("/") ||
				specifier.startsWith("node:") ||
				specifier === "bun" ||
				specifier.startsWith("bun:")
			) {
				continue;
			}
			const parts = specifier.split("/");
			const name = specifier.startsWith("@")
				? parts.slice(0, 2).join("/")
				: (parts[0] as string);
			if (!builtinModules.includes(name)) {
				names.add(name);
			}
		}
	}
	return names;
}

async function run(ps: Ps, cwd: string, argv: string[]): Promise<void> {
	const result = await ps.spawnCapture(argv, { cwd });
	if (result.exitCode !== 0) {
		throw new Error(
			`\`${argv.join(" ")}\` failed in ${cwd}:\n${`${result.stdout}${result.stderr}`.trim().split("\n").slice(-20).join("\n")}`,
		);
	}
}

/** Fields about the repository rather than the package, which npm never sees. */
const LOCAL = new Set([
	"devDependencies",
	"scripts",
	"files",
	"private",
	"workspaces",
	"trustedDependencies",
	"main",
	"module",
	"types",
	"exports",
	"bin",
	"dependencies",
	"peerDependencies",
	"peerDependenciesMeta",
]);

const DOCS = ["README.md", "LICENSE", "LICENSE.md", "CHANGELOG.md"];
