/** The GitHub releases a release publishes. */
export interface Github {
	/**
	 * Publishes release notes for `tag`, or leaves the existing ones alone,
	 * logging in along the way if that is what it takes.
	 */
	release(tag: string): Promise<void>;
	/** The tag of the latest release, or `undefined` when there is none. */
	latest(): Promise<string | undefined>;
}
