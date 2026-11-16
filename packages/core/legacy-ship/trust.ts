import { ConsoleLogger, color, type Logger } from "core/log";
import { Duration, sleep } from "core/time";
import type { Artifact } from "./artifact/artifact";
import { statusName } from "./release";

/** Where `Release.trust()` says what it did; the console by default. */
export interface TrustOptions {
	log?: Logger;
	/** How long to wait between packages, which npm asks for to avoid its rate limit; 2 seconds by default. */
	pause?: Duration;
}

/** Has each artifact that publishes from CI trust it, as `Release.trust()` runs it. */
export async function trust(
	artifacts: readonly Artifact[],
	opts: TrustOptions = {},
): Promise<void> {
	const log = opts.log ?? new ConsoleLogger();
	const pause = opts.pause ?? Duration.secs(2);
	const trusting = artifacts.flatMap((artifact) => {
		const trust = artifact.trust?.bind(artifact);
		return trust === undefined ? [] : [{ artifact, trust }];
	});
	if (trusting.length === 0) {
		throw new Error(
			"nothing in this release publishes from CI: give its registry `via: githubActions()`",
		);
	}
	const failed: string[] = [];
	for (const [index, { artifact, trust }] of trusting.entries()) {
		if (index > 0) {
			await sleep(pause);
		}
		const name = artifact.name ?? statusName(artifact);
		try {
			await trust(log);
			log.info(`${name} ${color.green("trusts the publish workflow")}`);
		} catch (error) {
			failed.push((error as Error).message);
		}
	}
	if (failed.length > 0) {
		throw new Error(failed.join("\n"));
	}
}
