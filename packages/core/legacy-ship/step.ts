import type { Duration } from "core/time";
import type { Stage } from "./artifact/artifact";
import type { Cut } from "./cut";
import type { SignInAsk } from "./step-events";

/** Where a caller-defined step runs. Preflight steps precede the release prompt. */
export type StepStage = "preflight" | Stage;

/** What a running step tells whoever is watching the release. */
export interface StepReport {
	/** A package went to a registry that holds it until somebody approves it. */
	staged(info: {
		package: string;
		version: string;
		stageId: string;
		url: string;
	}): Promise<void>;
	/**
	 * Asks whoever drives the release for a task that adopts the upstream
	 * versions, which the step could not simply move, and waits for the answer:
	 * `true` once the task landed its change in this tree. Absent when nobody
	 * can answer.
	 */
	adopt?(request: AdoptRequest): Promise<boolean>;
	/** Says the step found its work already done, so it reports skipped rather than done. */
	skipped?(): Promise<void>;
	/** Asks the user to sign in, when something can ask. */
	askSignIn?: SignInAsk;
	/** Asks the user for text, such as a one-time code; undefined when declined or when nothing can ask. */
	askText?(question: string): Promise<string | undefined>;
}

/** What an adopt step asks a task to do. */
export interface AdoptRequest {
	/** Upstream package name to the version to adopt. */
	versions: Record<string, string>;
	/** The pins that could not simply be moved. */
	unmovable: { name: string; file: string; pin: string }[];
}

/** What one poll of a step's check found, for a check with more to say than pass or fail. */
export interface CheckReport {
	readonly passed: boolean;
	/** What the step is still waiting on, in a word, such as `pending` or `held`. */
	readonly status?: string;
	/** Where a person can look into what it waits on. */
	readonly url?: string;
}

/**
 * One named unit of release work. A deadline tells callers when to consider the
 * step hung; it never cancels the work. A check, when present, retries, backing
 * off, until it confirms that the work really landed; `waited` is how long it
 * has waited so far.
 */
export interface Step<Context = Cut> {
	readonly name: string;
	readonly deadline: Duration;
	readonly stage?: StepStage;
	/**
	 * A question to ask before the step runs, such as whether staging looks
	 * right before production. The release's `prompt` asks it and `yes` skips
	 * it; anything but a yes stops the release with its RELEASE file left, so a
	 * rerun asks again and resumes. A dry run says what it would ask instead.
	 */
	readonly confirm?: string;
	run(cut: Context, report?: StepReport): Promise<void>;
	/**
	 * What the step does in a dry run in place of `run`, with no check after
	 * it: say what it would send, or send it somewhere local instead. A step
	 * without one runs as usual when it only works on this machine (preflight,
	 * stamp and build), and is skipped from the publish stage on, so a dry run
	 * never sends anything out.
	 */
	dryRun?(cut: Context): Promise<void>;
	check?(cut: Context, waited: Duration): Promise<boolean | CheckReport>;
	/**
	 * How often to check, steadily, in place of the backoff, for a check
	 * whose answer comes soon and is worth hearing as it comes.
	 */
	readonly checkEvery?: Duration;
}
