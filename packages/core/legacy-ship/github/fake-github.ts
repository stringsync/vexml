import type { Github } from "./github";

/** Remembering every tag it was asked to release. */
export class FakeGithub implements Github {
	readonly releases: string[] = [];
	/** Set it to fail every release, as gh does with nobody logged in. */
	error?: Error;

	async release(tag: string): Promise<void> {
		if (this.error !== undefined) {
			throw this.error;
		}
		this.releases.push(tag);
	}

	async latest(): Promise<string | undefined> {
		return this.releases.at(-1);
	}
}
