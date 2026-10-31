import type { Logger } from "core/log";
import type { Fs, Ps } from "core/system";
import type { Timer, WallClock } from "core/time";
import type { DryRun } from "./cut";
import type { Git } from "./git/git";
import type { StepStage } from "./step";
import type { Bump } from "./version";
import type { Workspace } from "./workspace/workspace";

/** What a release goes out through; the real system by default. */
export interface ReleaseOptions {
	/**
	 * How far to move the version; `patch` by default. A RELEASE file left by a
	 * run that died overrides it: that version is finished first.
	 */
	bump?: Bump;
	/** The packages the release stamps; the manifest workspace here by default. */
	workspace?: Workspace;
	/**
	 * The project folder whose packages the release stamps and publishes, with
	 * the version they stand at; every package of the workspace by default.
	 */
	project?: string;
	/** The repository the release commits; the workspace root's by default. */
	git?: Git;
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
	timer?: Timer;
	wallClock?: WallClock;
	// scry-ignore objects-over-callbacks: the platform's own prompt() is the
	// dependency here, and it is a bare function
	prompt?: (message: string) => string | null;
	/** Go ahead without asking, for a run whose caller has already approved it. */
	yes?: boolean;
	/**
	 * Rehearse the release without sending anything out: preflight, stamp and
	 * build run as they would, each package is packed rather than published
	 * and its pack installed and imported outside the workspace, a mirror
	 * pushes to a bare copy of its remote, and the rest says what it would
	 * have done. The stamp is undone afterwards and no RELEASE file is kept,
	 * and it asks nothing. `true` keeps what it made in a directory of its own
	 * for the run; a `DryRun` names one, which releases rehearsed one after
	 * another share, so a package installs beside the ones going out before it.
	 */
	dryRun?: boolean | DryRun;
}

/** Where `Release.status()` reads the workspace version from; the real system by default. */
export interface StatusOptions {
	/** The workspace whose version the artifacts are held against. */
	workspace?: Workspace;
	/**
	 * The project folder whose packages the release stamps and publishes, with
	 * the version they stand at; every package of the workspace by default.
	 */
	project?: string;
	fs?: Fs;
	ps?: Ps;
}

/** One artifact's live version, as `Release.status()` reads it. */
export interface DeployedArtifact {
	name: string;
	/** The workspace packages the artifact publishes, if any. */
	packages: readonly string[];
	/** What is live now; `undefined` when nothing is out yet. */
	deployed: string | undefined;
}

/** The workspace's version beside what each artifact has live. */
export interface ReleaseStatus {
	/** The version the workspace stands at, which the last release stamped. */
	version: string;
	/** Every artifact that can say what it has live, in release order. */
	artifacts: DeployedArtifact[];
}

/** Where `Release.plan()` reads from; the real system by default. */
export interface PlanOptions {
	/** How far the version would move; `patch` by default. */
	bump?: Bump;
	workspace?: Workspace;
	/**
	 * The project folder whose packages the release stamps and publishes, with
	 * the version they stand at; every package of the workspace by default.
	 */
	project?: string;
	git?: Git;
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
}

/** What `Release.publish()` publishes through; the real system by default. */
export interface PublishOptions {
	/** The packages to publish, at the version the workspace stands at. */
	workspace?: Workspace;
	/**
	 * The project folder whose packages the release stamps and publishes, with
	 * the version they stand at; every package of the workspace by default.
	 */
	project?: string;
	log?: Logger;
	fs?: Fs;
	ps?: Ps;
	timer?: Timer;
	wallClock?: WallClock;
}

/** One step of a release, as `Release.plan()` lists it. */
export interface PlannedStep {
	/** The id this step's run-time events carry. */
	id: string;
	name: string;
	stage: StepStage;
	/** The workspace packages the step publishes, if any. */
	packages: string[];
	/** The artifact the step belongs to, when it came from one. */
	artifact?: string;
	deadlineMs: number;
}

/** Every step a release would run, in order. `schema` grows with the shape. */
export interface ReleasePlan {
	schema: 1;
	/** The version the release would go out at. */
	version: string;
	/** Whether a RELEASE file from a run that died fixed that version. */
	resuming: boolean;
	steps: PlannedStep[];
}
