import { resolve } from "node:path";
import { color } from "core/log";
import { type Fs, NodeFs } from "core/system";
import type { Artifact, Stage } from "./artifact/artifact";
import type { Cut } from "./cut";

/** What a `SkillArtifact` reads and writes through; the real filesystem by default. */
export interface SkillArtifactOptions {
	fs?: Fs;
}

// The frontmatter block only, so a `version:` inside a fenced example in the
// body of a skill is never mistaken for the one that says where it came from.
const FRONTMATTER = /^---\n[\s\S]*?\n---/;
const VERSION = /^version:.*$/m;

/**
 * An agent skill whose frontmatter carries the version it shipped at. Its
 * stage is what makes the number true: the stamp goes into the release commit
 * beside every package.json, so the document a build bundles says the version
 * that bundled it.
 *
 * It publishes no package of its own, so it does not appear in what a release
 * says it will send.
 */
export class SkillArtifact implements Artifact {
	readonly packages: readonly string[] = [];
	readonly stage: Stage = "stamp";

	private readonly fs: Fs;

	constructor(
		/** The document, relative to the workspace root or absolute. */
		private readonly path: string,
		opts: SkillArtifactOptions = {},
	) {
		this.fs = opts.fs ?? new NodeFs();
	}

	async publish(cut: Cut): Promise<void> {
		const path = resolve(cut.root, this.path);
		const stamped = stamp(await this.fs.read(path), cut.version, this.path);
		await this.fs.write(path, stamped);
		cut.log.info(`${this.path} ${color.green(`stamped ${cut.version}`)}`);
	}
}

/**
 * `doc` with `version` in its frontmatter. A skill with nowhere to put it is a
 * skill whose copies can never be told apart, and the release that would have
 * shipped it is stopped here, while nothing has moved.
 */
function stamp(doc: string, version: string, path: string): string {
	const front = FRONTMATTER.exec(doc)?.[0];
	if (front === undefined || !VERSION.test(front)) {
		throw new Error(
			`${path} has no "version:" line in its frontmatter: add one for the release to stamp`,
		);
	}
	// The frontmatter is anchored at the start, so the body is whatever follows it.
	return (
		front.replace(VERSION, () => `version: ${version}`) +
		doc.slice(front.length)
	);
}
