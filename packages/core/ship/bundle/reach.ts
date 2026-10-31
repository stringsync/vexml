import { builtinModules } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import type { Fs } from "core/system";
import type { Exports, Manifest } from "./published";

/**
 * Every module specifier a file names, whether imported, re-exported, loaded
 * with `import()` or written in a declaration. Both the compiler and tsc write
 * double quotes, so source and output read the same way.
 */
export const SPECIFIER = /\b(from|import)(\s*\(?\s*)"([^"]+)"/g;

/** `SPECIFIER`, for source, where either quote may be used. */
const SOURCE_SPECIFIER = /\b(from|import)(\s*\(?\s*)(["'])([^"'\n]+)\3/g;

/** A source file a relative specifier can land on. */
export const SOURCE = /\.tsx?$/;

/** What a package name looks like, scope included. */
const PACKAGE_NAME = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;

/** A workspace package a release walks into, by name and where it sits. */
export interface Reached {
	name: string;
	dir: string;
}

/** What `reach` found: the entry points and every source file they lead to. */
export interface Reach {
	/** The `exports` keys needed, such as `.` or `./time`. */
	keys: Set<string>;
	/** The package's own source files, tests left out. */
	files: Set<string>;
}

/** The `exports` key a specifier of `pkg` names, which must be one it exports. */
export function keyOf(
	pkg: { name: string },
	exported: ReadonlyMap<string, string>,
	specifier: string,
): string {
	const key = `.${specifier.slice(pkg.name.length)}`;
	if (!exported.has(key)) {
		throw new Error(
			`${pkg.name} exports no "${key}", imported as "${specifier}"`,
		);
	}
	return key;
}

/**
 * The entry points `keys` need, themselves included, with the package's own
 * source followed through relative imports and through the entry points it
 * names by its own name, as the platform test walks it.
 */
export async function reach(
	fs: Fs,
	pkg: Reached,
	keys: readonly string[],
): Promise<Reach> {
	const manifest = await manifestAt(fs, pkg.dir);
	const exported = entries(manifest.exports ?? {});
	const found = new Set<string>();
	const seen = new Set<string>();
	const queue = [...keys];
	while (queue.length > 0) {
		const key = queue.pop() as string;
		if (found.has(key)) {
			continue;
		}
		found.add(key);
		const files = [`${pkg.dir}/${(exported.get(key) as string).slice(2)}`];
		while (files.length > 0) {
			const file = files.pop() as string;
			if (seen.has(file) || file.endsWith(".test.ts")) {
				continue;
			}
			seen.add(file);
			for (const specifier of await specifiers(file, fs)) {
				if (isPackage(specifier, pkg.name)) {
					queue.push(keyOf(pkg, exported, specifier));
				} else if (specifier.startsWith(".")) {
					const next = await resolve(fs, resolvePath(dirname(file), specifier));
					if (next !== undefined) {
						files.push(next);
					}
				}
			}
		}
	}
	return { keys: found, files: seen };
}

/** The source file a relative specifier names, or nothing for a file that is not code. */
async function resolve(fs: Fs, path: string): Promise<string | undefined> {
	const candidates = SOURCE.test(path)
		? [path]
		: [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`];
	for (const candidate of candidates) {
		if (await fs.exists(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

/** Whether `specifier` names `name` or one of its subpaths. */
export function isPackage(specifier: string, name: string): boolean {
	return specifier === name || specifier.startsWith(`${name}/`);
}

/** The package a specifier reaches outside the workspace and the runtime, if it does. */
export function outsider(specifier: string): string | undefined {
	if (
		specifier.startsWith(".") ||
		specifier.startsWith("node:") ||
		specifier.startsWith("bun:") ||
		specifier === "bun"
	) {
		return undefined;
	}
	const parts = specifier.split("/");
	const name = specifier.startsWith("@")
		? parts.slice(0, 2).join("/")
		: parts[0];
	// text such as `from "${trunk}"` in a message is no specifier
	return name === undefined ||
		!PACKAGE_NAME.test(name) ||
		builtinModules.includes(name)
		? undefined
		: name;
}

/** Every specifier in a file, in order. */
export async function specifiers(path: string, fs: Fs): Promise<string[]> {
	const text = await fs.read(path);
	return [...text.matchAll(SOURCE_SPECIFIER)].map(
		(match) => match[4] as string,
	);
}

/** Each `exports` subpath beside the source file it resolves to, conditions looked through. */
export function entries(exports: Exports): Map<string, string> {
	const found = new Map<string, string>();
	if (typeof exports === "string") {
		return found.set(".", exports);
	}
	for (const [key, value] of Object.entries(exports)) {
		const path = pathOf(value);
		if (path !== undefined) {
			found.set(key, path);
		}
	}
	return found;
}

function pathOf(exports: Exports): string | undefined {
	if (typeof exports === "string") {
		return exports;
	}
	for (const value of Object.values(exports)) {
		const path = pathOf(value);
		if (path !== undefined) {
			return path;
		}
	}
	return undefined;
}

export async function manifestAt(fs: Fs, dir: string): Promise<Manifest> {
	return JSON.parse(await fs.read(`${dir}/package.json`));
}

/** The root manifest's catalog, whichever way its workspaces are written. */
export async function catalogAt(
	fs: Fs,
	root: string,
): Promise<Record<string, string>> {
	const manifest = (await manifestAt(fs, root)) as {
		catalog?: Record<string, string>;
		workspaces?: { catalog?: Record<string, string> } | string[];
	};
	const nested = Array.isArray(manifest.workspaces)
		? undefined
		: manifest.workspaces?.catalog;
	return { ...manifest.catalog, ...nested };
}
