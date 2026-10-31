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
	fs?: Fs;
}

/** Tracks the version and completed steps of an in-flight release in RELEASE. */
export class ReleaseFile {
	private readonly path: string;
	private readonly fs: Fs;

	constructor(root: string, opts: ReleaseFileOptions = {}) {
		this.path = `${root}/RELEASE`;
		this.fs = opts.fs ?? new NodeFs();
	}

	/** The release under way, or null when the previous one finished. */
	async read(): Promise<ReleaseState | null> {
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
