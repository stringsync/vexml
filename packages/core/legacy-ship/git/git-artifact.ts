import { color } from "core/log";
import { NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import type { Artifact, Stage } from "../artifact/artifact";
import type { Cut } from "../cut";
import type { Step } from "../step";
import { newest } from "../version";
import { CliGit } from "./cli-git";
import type { Git } from "./git";

/** What a `GitArtifact` speaks git through; the repository here by default. */
export interface GitArtifactOptions {
	git?: Git;
	ps?: Ps;
}

/** Pushes the release commit and tag after every package has published. */
export class GitArtifact implements Artifact {
	readonly name = "git tag";
	readonly packages: readonly string[] = [];
	readonly stage: Stage = "tag";

	private readonly git: Git;

	constructor(opts: GitArtifactOptions = {}) {
		const ps = opts.ps ?? new NodePs();
		this.git = opts.git ?? new CliGit(ps.cwd(), { ps });
	}

	steps(cut: Cut): readonly Step[] {
		return [
			{
				name: "Push branch",
				deadline: Duration.mins(2),
				stage: "tag",
				run: () => this.pushBranch(),
				dryRun: async (at) =>
					at.log.info(color.yellow("would push the branch")),
			},
			{
				name: `Tag ${cut.tag}`,
				deadline: Duration.secs(30),
				stage: "tag",
				run: async () => this.git.tag(cut.tag),
				dryRun: async (at) => at.log.info(color.yellow(`would tag ${at.tag}`)),
			},
			{
				name: `Push ${cut.tag}`,
				deadline: Duration.mins(2),
				stage: "tag",
				run: async () => {
					await this.git.push(cut.tag);
					cut.log.info(`${cut.tag} ${color.green("pushed")}`);
				},
				dryRun: async (at) => at.log.info(color.yellow(`would push ${at.tag}`)),
			},
		];
	}

	async publish(cut: Cut): Promise<void> {
		await this.pushBranch();
		await this.git.tag(cut.tag);
		await this.git.push(cut.tag);
		cut.log.info(`${cut.tag} ${color.green("pushed")}`);
	}

	/** The version of the newest release tag on origin. */
	async deployed(): Promise<string | undefined> {
		const tags = await this.git.remoteTags("v*");
		return newest(tags.map((tag) => tag.slice(1)));
	}

	private async pushBranch(): Promise<void> {
		// The branch goes first: a tag left behind by a push origin rejected reads
		// as a finished release, and sends the next run past this version.
		await this.git.push(await this.git.branch());
	}
}
