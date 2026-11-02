import type { Fs } from "core/system";
import {
	entries,
	isPackage,
	keyOf,
	manifestAt,
	reach,
	specifiers,
} from "../bundle/reach";
import type { Package } from "../workspace/workspace";

/** What of a source package a mirror holds: its entry points and the files they lead to. */
export interface Reached {
	keys: Set<string>;
	files: Set<string>;
}

/**
 * The entry points of each source the copied files name, and the files they
 * lead to. A source reached only through another source is found by going
 * over the sources again until none reaches more.
 */
export async function reachedAll(
	fs: Fs,
	copied: readonly string[],
	sources: readonly Package[],
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
			const used = await reached(fs, inputs, source);
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
	return reach(fs, source, [...wanted]);
}
