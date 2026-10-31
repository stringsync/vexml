import type { Logger } from "core/log";
import type { Ps } from "core/system";

/**
 * The least a cli needs handed to it: somewhere to print help and errors, and
 * something that can end the process. A program declares its own dependencies
 * as an extension of this, `cli<MyDeps>(name)` types `run` against them, and
 * they seed the context every action receives.
 */
export interface Deps {
	log: Logger;
	ps: Ps;
}
