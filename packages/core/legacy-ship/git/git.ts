/** The git a release speaks, scoped to one repository. */
export interface Git {
	/** Whether the tree has no uncommitted changes. */
	clean(): Promise<boolean>;
	branch(): Promise<string>;
	/** The commit HEAD is at. */
	head(): Promise<string>;
	/** Where releases go out from. */
	defaultBranch(): Promise<string>;
	/**
	 * The files with uncommitted changes, each saying whether its diff touches
	 * only `version` lines, which is all a release's own stamp changes. A release
	 * that finds a dead run's stamps uses it to put them back; without it, a dirty
	 * tree always stops the release.
	 */
	changes?(): Promise<GitChange[]>;
	/** Puts the given tracked files, or every one, back as HEAD has them, as a dry run does with its stamp. */
	discard(paths?: readonly string[]): Promise<void>;
	/** Commits every tracked change. A clean tree is already committed, so it passes. */
	commitAll(message: string): Promise<void>;
	/** Tags the commit at HEAD. A tag already there is left where it is. */
	tag(tag: string): Promise<void>;
	push(ref: string): Promise<void>;
	/** The names of origin's tags matching `pattern`, a glob such as `v*`. */
	remoteTags(pattern: string): Promise<string[]>;
}

/** A file with uncommitted changes. */
export interface GitChange {
	/** Relative to the repository root. */
	path: string;
	/** Whether the only lines its diff touches are `version` lines. */
	versionOnly: boolean;
}
