import { type Fs, NodeFs } from "core/system";

/** What RELEASE holds while a release is under way. */
export interface ReleaseState {
	/** The version everything goes out at. */
	version: string;
	/** The steps that already landed, by the keys the release gave them. */
	done: string[];
}

/** What a `ReleaseFile` reads and writes through; the real filesystem by default. */
export interface ReleaseFileOptions {
	/**
	 * The project the release is of, in a workspace root that holds several. Its
	 * file is `RELEASE.<project>`, so one project's release that died is never
	 * finished by another's; with none, the file is `RELEASE`.
	 */
	project?: string;
	fs?: Fs;
}

/** Tracks the version and completed steps of an in-flight release in RELEASE. */
export class ReleaseFile {
	private readonly path: string;
	private readonly unscoped: string | null;
	private readonly fs: Fs;

	constructor(root: string, opts: ReleaseFileOptions = {}) {
		const bare = `${root}/RELEASE`;
		this.path = opts.project === undefined ? bare : `${bare}.${opts.project}`;
		this.unscoped = opts.project === undefined ? null : bare;
		this.fs = opts.fs ?? new NodeFs();
	}

	/** The release under way, or null when the previous one finished. */
	async read(): Promise<ReleaseState | null> {
		// A bare RELEASE beside project files is from before they were scoped, or
		// from a release of the whole workspace: whose it is cannot be known, and
		// guessing is how one project came to finish another's version.
		if (this.unscoped !== null && (await this.fs.exists(this.unscoped))) {
			throw new Error(
				`${this.unscoped} belongs to no project: finish the release it was tracking, or delete it, before releasing ${this.path.slice(this.unscoped.length + 1)}`,
			);
		}
		if (!(await this.fs.exists(this.path))) {
			return null;
		}
		const state = parse(await this.fs.read(this.path));
		if (state === null) {
			// Guessing at a mangled state could republish or, worse, bump past a
			// version that never finished, so this is a person's call to make.
			throw new Error(
				`${this.path} does not hold release state: finish the release it was tracking or delete it`,
			);
		}
		return state;
	}

	async write(state: ReleaseState): Promise<void> {
		await this.fs.write(this.path, `${JSON.stringify(state, null, "\t")}\n`);
	}

	async clear(): Promise<void> {
		await this.fs.rm(this.path, { force: true });
	}
}

function parse(contents: string): ReleaseState | null {
	try {
		const state = JSON.parse(contents);
		if (
			typeof state.version !== "string" ||
			!Array.isArray(state.done) ||
			!state.done.every((key: unknown) => typeof key === "string")
		) {
			return null;
		}
		return { version: state.version, done: state.done };
	} catch {
		return null;
	}
}
