import type { Logger } from "core/log";
import type { Duration } from "core/time";
import type { CheckReport } from "../step";
import type { SignInAsk } from "../step-events";
import type { Package } from "../workspace/workspace";

/** A package a registry holds back until somebody approves it. */
export interface StagedPackage {
	/** What approves it, as `npm stage approve` takes it. */
	stageId: string;
	/** The page to approve it on. */
	url: string;
}

/**
 * What a registry took from one publish. Either way it now has the version,
 * though it may not serve it yet: it is accepted, and live once installable.
 */
export interface Publication {
	/**
	 * The registry had this version already, as npm answers a retry of one it
	 * took but is still scanning, so nothing went out this time.
	 */
	readonly already?: boolean;
	/** Set when the registry holds the version until somebody approves it. */
	readonly staged?: StagedPackage;
}

/** What a release asks of one `Registry.publish`. */
export interface PublishRegistryOptions {
	/** Deploy even what is already live at the version; only sent to a registry that `redeploys`. */
	force?: boolean;
	/** Asks the user to sign in, when the registry needs it and something can ask. */
	askSignIn?: SignInAsk;
	/** Asks the user for a one-time code, when the registry wants one and something can ask. */
	askText?(question: string): Promise<string | undefined>;
}

/** The package registry, as a release touches it. */
export interface Registry {
	/**
	 * Whether `publish` only stages, leaving each version unavailable until a
	 * person approves it. A release then waits for `published` to turn true
	 * before it tags.
	 */
	readonly staged?: boolean;
	/**
	 * Whether `publish` can deploy a version that is already live, as a stack
	 * deploy can and npm cannot. Only then does a forced release redeploy.
	 */
	readonly redeploys?: boolean;
	/** Whether `version` of `name` is live: installable, not merely accepted. */
	published(name: string, version: string): Promise<boolean>;
	/** The version an install of `name` gets now, or `undefined` before any is out. */
	deployed(name: string): Promise<string | undefined>;
	/**
	 * Publishes the package in `dir`, logging in along the way if that is what
	 * publishing here takes. Throws if the registry does not take it.
	 */
	publish(dir: string, opts?: PublishRegistryOptions): Promise<Publication>;
	/**
	 * Packs the package in `dir` into the directory `into`, as the registry
	 * would receive it, for a dry run. Leave it off when there is no such
	 * thing, and a dry run only says what it would publish.
	 */
	pack?(dir: string, into: string): Promise<void>;
	/**
	 * This registry as a CI job it trusts publishes to it, with no stage and
	 * no login. Leave it off when there is no such way to publish.
	 */
	trusted?(): Registry;
	/**
	 * How long `publish` and its `watch` may take before the release considers
	 * them hung; five minutes when omitted.
	 */
	readonly publishDeadline?: Duration;
	/**
	 * Whether what `publish` handed off has finished, when it hands off to a
	 * run elsewhere and returns before the version is accepted. The release
	 * polls it after `publish`; throwing fails the step. Leave it off when
	 * `publish` returns once the registry has the version.
	 */
	watch?(name: string, version: string): Promise<CheckReport>;
	/**
	 * Has the registry trust the CI job that publishes `name`, which takes a
	 * person to authenticate. Leave it off when nothing publishes from CI.
	 */
	trust?(name: string, log: Logger): Promise<void>;
	/**
	 * Throws, saying what to fix, when the registry would refuse `pkg`, before
	 * the release stamps a version for it. Leave it off when the registry
	 * takes whatever it is sent.
	 */
	verify?(pkg: Package): Promise<void>;
	/** Where a person can see `version` of `name`, and why it is not live yet. */
	page?(name: string, version: string): string;
}
