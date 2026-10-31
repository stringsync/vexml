import { ConsoleLogger, type Logger } from "core/log";
import type { Package } from "./workspace/workspace";

/**
 * Where a dry run keeps what it makes in place of sending it: the packages it
 * packs in `<dir>/packs`, the copies of remotes it pushes to in
 * `<dir>/remotes`, and the project that installs the packs in
 * `<dir>/consumer`. Several releases sharing one see each other's packs.
 */
export interface DryRun {
	dir: string;
}

/** Where a `Cut` speaks and sits; the console and the working directory by default. */
export interface CutOptions {
	/** Set for a dry run, which sends nothing out. */
	dryRun?: DryRun;
	log?: Logger;
	/** The workspace root, which any path an artifact holds is relative to. */
	root?: string;
}

/**
 * The release under way, as one artifact of it sees it: the version everything
 * goes out at, the tag that names it, and where the packages sit. By the time
 * an artifact is handed one, every package is stamped; everything past the
 * `stamp` stage sees that stamp committed too.
 */
export class Cut {
	/** The tag naming this release, such as `v1.2.4`. */
	readonly tag: string;
	/** Where an artifact says what it did. */
	readonly log: Logger;
	/** The workspace root, which any path an artifact holds is relative to. */
	readonly root: string;
	/** Set for a dry run, which sends nothing out. */
	readonly dryRun?: DryRun;

	/** Package name to where a build put what that package publishes. */
	private readonly staged = new Map<string, string>();

	constructor(
		/** The version every package in this release goes out at. */
		readonly version: string,
		/**
		 * Every package in the workspace, each one after the siblings it depends
		 * on. An artifact that works through them in this order never reaches a
		 * package before whatever it needs is ready.
		 */
		readonly packages: readonly Package[],
		opts: CutOptions = {},
	) {
		this.tag = `v${version}`;
		this.log = opts.log ?? new ConsoleLogger();
		this.root = opts.root ?? ".";
		this.dryRun = opts.dryRun;
	}

	/**
	 * Where the named package publishes from, when the workspace has it: what a
	 * build staged for it, or its own directory when nothing built anything.
	 */
	dir(name: string): string | undefined {
		const pkg = this.packages.find((one) => one.name === name);
		return pkg === undefined ? undefined : (this.staged.get(name) ?? pkg.dir);
	}

	/**
	 * Says the named package publishes from `dir`. A build calls this so that
	 * the stage after it sends the built package rather than the source one.
	 */
	stage(name: string, dir: string): void {
		this.staged.set(name, dir);
	}
}
