import { matchesGlob } from "node:path";
import type { Glob } from "./glob";

/**
 * A `Glob` that runs anywhere Node's `node:path` API does, Bun included.
 *
 * ```ts
 * const glob = new NodeGlob();
 * glob.matches("src/*.ts", "src/main.ts"); // true
 * ```
 */
export class NodeGlob implements Glob {
	// Stateless: `matchesGlob` compiles nothing worth keeping.
	//
	// ponytail: `matchesGlob` is still marked experimental in Node, though it is
	// stable in 24 and Bun implements it. If it ever disagrees with `Bun.Glob`,
	// `BunGlob` is a small class beside this one holding a `Map` of compiled
	// patterns, and the only other change is which one gets constructed.
	matches(pattern: string, path: string): boolean {
		return matchesGlob(path, pattern);
	}
}
