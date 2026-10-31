/** The git a release speaks, scoped to one repository. */
export interface Git {
	/** Whether the tree has no uncommitted changes. */
	clean(): Promise<boolean>;
	branch(): Promise<string>;
	/** The commit HEAD is at. */
	head(): Promise<string>;
	/** Where releases go out from. */
	defaultBranch(): Promise<string>;
	/** Puts every tracked file back as HEAD has it, as a dry run does with its stamp. */
	discard(): Promise<void>;
	/** Commits every tracked change. A clean tree is already committed, so it passes. */
	commitAll(message: string): Promise<void>;
	/** Tags the commit at HEAD. A tag already there is left where it is. */
	tag(tag: string): Promise<void>;
	push(ref: string): Promise<void>;
	/** The names of origin's tags matching `pattern`, a glob such as `v*`. */
	remoteTags(pattern: string): Promise<string[]>;
}
