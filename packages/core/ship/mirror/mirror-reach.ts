import { relative } from "node:path";
import type { Fs, Glob } from "core/system";
import {
	entries,
	isPackage,
	keyOf,
	manifestAt,
	reach,
	specifiers,
} from "../bundle/reach";
import type { Package } from "../workspace/workspace";
import type { MirrorOptions } from "./mirror-options";

/** What of a source package a mirror holds: its entry points and the files they lead to. */
export interface Reached {
	keys: Set<string>;
	files: Set<string>;
}

/** Files of a source package, by absolute path, the mirror holds though no import reaches them. */
export interface Extra {
	/** Copied as they are: assets nothing imports. */
	files: readonly string[];
	/** Copied and followed for imports, as if an entry point named them. */
	entries: readonly string[];
}

/**
 * The entry points of each source the copied files name, and the files they
 * lead to, with any `extra` files of a source added. Sources reached through
 * one another are all found.
 */
export async function reachedAll(
	fs: Fs,
	copied: readonly string[],
	sources: readonly Package[],
	extra: ReadonlyMap<string, Extra> = new Map(),
): Promise<Map<string, Reached>> {
	const found = new Map<string, Reached>();
	for (const source of sources) {
		found.set(source.name, { keys: new Set(), files: new Set() });
	}
	for (let changed = true; changed; ) {
		changed = false;
		const inputs = [
			...copied,
			...[...found.values()].flatMap((one) => [...one.files]),
		];
		for (const source of sources) {
			const used = await reached(fs, inputs, source, extra.get(source.name));
			if (used.files.size > (found.get(source.name) as Reached).files.size) {
				found.set(source.name, used);
				changed = true;
			}
		}
	}
	return found;
}

/** The entry points of `source` the files name, and the files they lead to. */
async function reached(
	fs: Fs,
	paths: readonly string[],
	source: Package,
	extra?: Extra,
): Promise<Reached> {
	const manifest = await manifestAt(fs, source.dir);
	const exported = entries(manifest.exports ?? {});
	const wanted = new Set<string>();
	for (const path of paths) {
		if (!/\.tsx?$/.test(path)) {
			continue;
		}
		for (const specifier of await specifiers(path, fs)) {
			if (isPackage(specifier, source.name)) {
				wanted.add(keyOf(source, exported, specifier));
			}
		}
	}
	const found = await reach(fs, source, [...wanted], extra?.entries);
	for (const file of [...(extra?.files ?? []), ...(extra?.entries ?? [])]) {
		found.files.add(file);
	}
	return found;
}

/**
 * The files `sourceExtra` names in each source package, as absolute paths,
 * listing a package's files with `list`.
 */
export async function extrasOf(
	want: NonNullable<MirrorOptions["sourceExtra"]>,
	folded: readonly Package[],
	glob: Glob,
	list: (dir: string) => Promise<string[]>,
): Promise<Map<string, Extra>> {
	const found = new Map<string, Extra>();
	for (const [name, globs] of Object.entries(want)) {
		const pkg = folded.find((one) => one.name === name);
		if (pkg === undefined) {
			throw new Error(`sourceExtra names ${name}, which is not a source`);
		}
		const all = await list(pkg.dir);
		const pick = (patterns: readonly string[] = []): string[] =>
			patterns.flatMap((pattern) => {
				const hit = all.filter((path) =>
					glob.matches(pattern, relative(pkg.dir, path)),
				);
				if (hit.length === 0) {
					throw new Error(
						`sourceExtra for ${name} names ${pattern}, which matches nothing`,
					);
				}
				return hit;
			});
		found.set(name, { files: pick(globs.files), entries: pick(globs.entries) });
	}
	return found;
}
