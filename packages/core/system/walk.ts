import type { Fs } from "./fs/fs";
import { NodeFs } from "./fs/node-fs";

/**
 * Yields the path of every file under `dir`, recursively. Dotfiles and
 * `node_modules` are skipped, so what comes back is a project's own source.
 */
export interface WalkOptions {
	/** The filesystem to read; the real one by default. */
	fs?: Fs;
}

export async function* walk(
	dir: string,
	opts: WalkOptions = {},
): AsyncGenerator<string> {
	const files = opts.fs ?? new NodeFs();
	for (const entry of await files.readdir(dir)) {
		if (entry.startsWith(".") || entry === "node_modules") {
			continue;
		}
		const path = `${dir}/${entry}`;
		if ((await files.stat(path)).isDirectory()) {
			yield* walk(path, { fs: files });
		} else {
			yield path;
		}
	}
}
