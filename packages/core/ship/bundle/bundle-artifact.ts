import { color } from "core/log";
import type { Artifact, Stage } from "../artifact/artifact";
import type { Cut } from "../cut";
import { BunBundle } from "./bun-bundle";
import type { Bundle } from "./bundle";

/**
 * Builds every package that is going out, before any of them do. Its stage is
 * what makes that true: a build that fails once a registry has taken half the
 * workspace leaves versions nobody can install and nobody can republish, so
 * the compiler runs while failing is still free.
 *
 * It publishes no packages of its own, so it does not appear in what a release
 * says it will send.
 */
export class BundleArtifact implements Artifact {
	readonly packages: readonly string[] = [];
	readonly stage: Stage = "build";

	constructor(private readonly bundle: Bundle = new BunBundle()) {}

	async publish(cut: Cut): Promise<void> {
		const going = cut.packages.filter((pkg) => !pkg.private);
		for (const pkg of going) {
			cut.stage(pkg.name, await this.bundle.build(pkg.dir));
		}
		cut.log.info(`${going.length} packages ${color.green("built")}`);
	}

	/** Built output is the release's, not the repository's, however it ended. */
	async clean(cut: Cut): Promise<void> {
		for (const pkg of cut.packages) {
			await this.bundle.clean(pkg.dir);
		}
	}
}
