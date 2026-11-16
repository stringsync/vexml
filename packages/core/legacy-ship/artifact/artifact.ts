import type { Logger } from "core/log";
import type { Cut } from "../cut";
import type { Step } from "../step";

/** Use a stage to place an artifact before or after the other release work. */
export type Stage = "stamp" | "build" | "publish" | "approve" | "tag" | "notes";

/** Every stage, in the order a release runs them. */
export const STAGES: readonly Stage[] = [
	"stamp",
	"build",
	"publish",
	"approve",
	"tag",
	"notes",
];

/** Implement an artifact to add a publishing operation to `releases.lockstep`. */
export interface Artifact {
	/** What `Release.status()` calls it; its packages or its stage when omitted. */
	readonly name?: string;
	/** The public workspace packages this artifact publishes, if any. */
	readonly packages: readonly string[];
	/** When this runs relative to the other artifacts; `publish` when omitted. */
	readonly stage?: Stage;
	/** Carries this artifact out at the version in `cut`. */
	publish(cut: Cut): Promise<void>;
	/**
	 * What `publish` does in a dry run, as `Step.dryRun`; an artifact with
	 * `steps` gives each step its own instead.
	 */
	dryRun?(cut: Cut): Promise<void>;
	/**
	 * Declares finer-grained progress and resume steps. Without it, the release
	 * wraps `publish` in one step.
	 */
	steps?(cut: Cut): readonly Step[];
	/**
	 * This artifact as `Release.publish()` runs it, from a CI job the registry
	 * trusts. Leave it off when it goes out the same way anywhere.
	 */
	trusted?(): Artifact;
	/**
	 * Has wherever this publishes trust the CI job `Release.publish()` runs in.
	 * Leave it off when nothing about it publishes from CI.
	 */
	trust?(log: Logger): Promise<void>;
	/**
	 * Throws, saying what to fix, when this artifact cannot go out as the
	 * checkout stands. The release asks before it stamps anything, so a
	 * mistake costs no version. Leave it off when there is nothing to check.
	 */
	verify?(cut: Cut): Promise<void>;
	/** Removes output this artifact created, after success or failure. */
	clean?(cut: Cut): Promise<void>;
	/**
	 * The version live wherever this artifact publishes to, or `undefined` when
	 * nothing is out yet. Leave it off when there is nowhere to ask, as for a
	 * build or a stamp, and `Release.status()` skips the artifact.
	 */
	deployed?(): Promise<string | undefined>;
}
