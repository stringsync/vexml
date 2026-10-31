/** One workspace package, as a release sees it. */
export interface Package {
	name: string;
	/** The directory holding its package.json. */
	dir: string;
	/** Private packages still get the version stamp; they just never go out. */
	private: boolean;
	/**
	 * The workspace packages this one needs, which is what puts it later in the
	 * order a release builds and publishes in. Only siblings appear here:
	 * everything from outside the workspace is already on the registry.
	 */
	dependencies: readonly string[];
	/** The URL its manifest's `repository` names, if it names one. */
	repository?: string;
}

/**
 * The packages a release stamps and publishes. One version covers the whole
 * workspace.
 */
export interface Workspace {
	/** The directory the workspace is rooted at. */
	readonly root: string;
	/** The version every package in the workspace shares. */
	version(): Promise<string>;
	packages(): Promise<Package[]>;
	/** Stamps `version` into every package, in lockstep. */
	setVersion(version: string): Promise<void>;
}
