import type { Git, GitChange } from "./git";

/**
 * A clean tree on the default branch, at a commit that is not a release.
 * Move a field to say otherwise; the arrays record what was done to it.
 */
export class FakeGit implements Git {
	dirty = false;
	current = "main";
	trunk = "main";
	readonly tags = new Set<string>();
	readonly commits: string[] = [];
	readonly pushes: string[] = [];
	/** Tags origin holds, whatever the pattern; `push` of a tag adds to them. */
	readonly remote = new Set<string>();
	/** Refs push refuses, as origin does when somebody else got there first. */
	readonly rejects = new Set<string>();

	async clean(): Promise<boolean> {
		return !this.dirty;
	}

	async branch(): Promise<string> {
		return this.current;
	}

	/** The commit HEAD reads as. */
	sha = "abc123";

	async head(): Promise<string> {
		return this.sha;
	}

	async defaultBranch(): Promise<string> {
		return this.trunk;
	}

	/** How many times `discard` put the tree back. */
	discards = 0;

	/** What `changes` reports while `dirty`; leave it empty for a change that is no stamp. */
	changed: GitChange[] = [];
	/** The paths of the last `discard`, when it was given any. */
	discarded: readonly string[] | undefined;

	async changes(): Promise<GitChange[]> {
		return this.dirty ? this.changed : [];
	}

	async discard(paths?: readonly string[]): Promise<void> {
		this.discards++;
		this.discarded = paths;
		this.dirty = false;
		this.changed = [];
	}

	async commitAll(message: string): Promise<void> {
		this.commits.push(message);
	}

	async tag(tag: string): Promise<void> {
		this.tags.add(tag);
	}

	async push(ref: string): Promise<void> {
		if (this.rejects.has(ref)) {
			throw new Error(`git push origin ${ref}: rejected`);
		}
		this.pushes.push(ref);
		if (this.tags.has(ref)) {
			this.remote.add(ref);
		}
	}

	async remoteTags(): Promise<string[]> {
		return [...this.remote];
	}
}
