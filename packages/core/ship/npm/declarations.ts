import { dirname, join, relative } from "node:path";
import type { Fs } from "core/system";
import { type Exports, type Member, PackageFiles, SOURCE } from "./workspace";

/** What `emitDeclarations` compiles, and where the bundled packages sit. */
export interface DeclarationsOptions {
	fs: Fs;
	/** The mirror's root. */
	root: string;
	/** The package's folder, relative to `root`. */
	package: string;
	/**
	 * The folder `types` mirrors, relative to `root`: `packages` (the default),
	 * or `.` when the package sits at the root.
	 */
	base?: string;
	/** The files to compile, relative to `root`. */
	files: string[];
	/** The private packages the build carries, by name. */
	bundled: Set<string>;
	members: Map<string, Member>;
	/** Runs tsc on the config at the path it is given, from `root`. */
	tsc(config: string): Promise<void>;
}

/**
 * Writes the package's declarations to `dist/types`, with those of the
 * bundled packages it reaches beside them, and points each declaration's
 * specifiers at files there, so nothing names a package npm lacks.
 */
export async function emitDeclarations(
	opts: DeclarationsOptions,
): Promise<void> {
	const { fs, bundled, members } = opts;
	// A tsconfig of the build's own, since tsc emits nothing for a file it
	// reaches through node_modules: `paths` sends each bundled package's
	// exports straight to its source, so their declarations come out too.
	const config = join(opts.root, "tsconfig.publish.json");
	await fs.write(
		config,
		JSON.stringify({
			compilerOptions: {
				declaration: true,
				emitDeclarationOnly: true,
				outDir: join(opts.package, "dist/types"),
				rootDir: opts.base ?? "packages",
				module: "preserve",
				moduleResolution: "bundler",
				target: "esnext",
				lib: ["esnext", "dom"],
				types: ["bun"],
				jsx: "react-jsx",
				allowImportingTsExtensions: true,
				resolveJsonModule: true,
				strict: true,
				skipLibCheck: true,
				paths: pathsOf(bundled, members, opts.root),
			},
			files: opts.files,
		}),
	);
	try {
		await opts.tsc(config);
	} finally {
		await fs.rm(config, { force: true });
	}
	await pointDeclarations(
		fs,
		join(opts.root, opts.package, "dist/types"),
		join(opts.root, opts.base ?? "packages"),
		bundled,
		members,
	);
}

/**
 * Finds the imports and re-exports of built code or declarations: use it
 * with `matchAll`, and read the specifier from the second group.
 */
// Only a statement opening a line counts, or an `import("…")`, so a comment
// or a string quoting an import is passed over.
export const SPECIFIER =
	/(^[ \t]*(?:import|export)\b[^;]*?(?<=[\s}*])from\s*["']|^[ \t]*import\s*["']|\bimport\(\s*["'])([^"']+)(["'])/gm;

/** tsc's `paths` for each export of each bundled package, at its source. */
function pathsOf(
	bundled: Set<string>,
	members: Map<string, Member>,
	root: string,
): Record<string, string[]> {
	const paths: Record<string, string[]> = {};
	for (const name of bundled) {
		const member = members.get(name) as Member;
		const exports = member.manifest.exports;
		const entries: [string, Exports][] =
			typeof exports === "string"
				? [[".", exports]]
				: Object.entries(exports ?? {});
		for (const [key, entry] of entries) {
			if (typeof entry === "string" && SOURCE.test(entry)) {
				paths[`${name}${key.slice(1)}`] = [
					`./${relative(root, join(member.dir, entry))}`,
				];
			}
		}
	}
	return paths;
}

/**
 * Points the declarations' specifiers at files of the build: a relative one
 * at the `.js` its declaration sits beside, and one naming a bundled package
 * at that package's declarations under `types`.
 */
async function pointDeclarations(
	fs: Fs,
	types: string,
	packagesDir: string,
	bundled: Set<string>,
	members: Map<string, Member>,
): Promise<void> {
	for (const path of await new PackageFiles(fs).list(types)) {
		if (!path.endsWith(".d.ts")) {
			continue;
		}
		const file = join(types, path);
		const before = await fs.read(file);
		const edits = new Map<string, string>();
		for (const match of before.matchAll(SPECIFIER)) {
			const specifier = match[2] as string;
			if (edits.has(specifier)) {
				continue;
			}
			const target = specifier.startsWith(".")
				? await relativeTarget(fs, dirname(file), specifier)
				: bundledTarget(specifier, bundled, members, packagesDir, types);
			if (target !== undefined) {
				let pointed = relative(dirname(file), target);
				if (!pointed.startsWith(".")) {
					pointed = `./${pointed}`;
				}
				edits.set(specifier, pointed);
			}
		}
		if (edits.size > 0) {
			await fs.write(
				file,
				before.replace(
					SPECIFIER,
					(whole, head: string, specifier: string, tail: string) => {
						const next = edits.get(specifier);
						return next === undefined ? whole : `${head}${next}${tail}`;
					},
				),
			);
		}
	}
}

/** The `.js` a relative specifier in a declaration under `from` stands for. */
async function relativeTarget(
	fs: Fs,
	from: string,
	specifier: string,
): Promise<string | undefined> {
	const base = join(from, specifier.replace(/\.(tsx?|jsx?)$/, ""));
	if (await fs.exists(`${base}.d.ts`)) {
		return `${base}.js`;
	}
	if (await fs.exists(join(base, "index.d.ts"))) {
		return join(base, "index.js");
	}
	return undefined;
}

/** The `.js` under `types` a specifier naming a bundled package stands for. */
function bundledTarget(
	specifier: string,
	bundled: Set<string>,
	members: Map<string, Member>,
	packagesDir: string,
	types: string,
): string | undefined {
	for (const name of bundled) {
		if (specifier !== name && !specifier.startsWith(`${name}/`)) {
			continue;
		}
		const member = members.get(name) as Member;
		const key = `.${specifier.slice(name.length)}`;
		const exports = member.manifest.exports;
		const entry =
			typeof exports === "string"
				? key === "."
					? exports
					: undefined
				: exports?.[key];
		if (typeof entry !== "string" || !SOURCE.test(entry)) {
			return undefined;
		}
		return join(
			types,
			relative(packagesDir, member.dir),
			entry.replace(SOURCE, ".js"),
		);
	}
	return undefined;
}
