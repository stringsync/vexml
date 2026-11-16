/** Turning a package's source into the files that actually go out. */
export interface Bundle {
	/**
	 * Builds the package in `dir` and answers where the result publishes from,
	 * which is a directory of its own rather than `dir` itself: a package
	 * publishes what it built, and nothing publishes what it was written in.
	 * Throws if it does not build, which is the whole point of running before
	 * anything reaches a registry.
	 */
	build(dir: string): Promise<string>;
	/** Removes what `build` left, whether or not it got that far. */
	clean(dir: string): Promise<void>;
}
