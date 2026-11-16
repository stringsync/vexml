import type { Cut } from "../cut";
import type { Artifact, Stage } from "./artifact";

/**
 * A artifact publishing the packages it was named for, at the `publish` stage
 * unless a test moves `stage`. `cuts` holds every release it went into.
 */
export class FakeArtifact implements Artifact {
	readonly cuts: Cut[] = [];
	stage?: Stage;

	constructor(readonly packages: readonly string[] = []) {}

	async publish(cut: Cut): Promise<void> {
		this.cuts.push(cut);
	}
}
