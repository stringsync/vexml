import { NodePs, type Ps } from "core/system";
import type { Git, GitChange } from "./git";

/** What a `CliGit` spawns through; the real process by default. */
export interface CliGitOptions {
	ps?: Ps;
}

/** Speaks git by spawning the CLI. */
export class CliGit implements Git {
	private readonly ps: Ps;

	constructor(
		private readonly root: string,
		opts: CliGitOptions = {},
	) {
		this.ps = opts.ps ?? new NodePs();
	}

	async clean(): Promise<boolean> {
		return (await this.out("status", "--porcelain")) === "";
	}

	branch(): Promise<string> {
		return this.out("rev-parse", "--abbrev-ref", "HEAD");
	}

	head(): Promise<string> {
		return this.out("rev-parse", "HEAD");
	}

	/** Where releases go out from. */
	async defaultBranch(): Promise<string> {
		const head = await this.run(
			"symbolic-ref",
			"--short",
			"refs/remotes/origin/HEAD",
		);
		// A clone that never fetched origin's HEAD has no ref to read, and a
		// wrong guess only ever costs a branch problem the caller can see.
		return head.exitCode === 0
			? head.stdout.trim().replace(/^origin\//, "")
			: "main";
	}

	/** Commits every tracked change. A clean tree is already committed, so it passes. */
	async discard(paths?: readonly string[]): Promise<void> {
		await this.out("checkout", "HEAD", "--", ...(paths ?? [":/"]));
	}

	async changes(): Promise<GitChange[]> {
		const status = await this.out("status", "--porcelain", "-z");
		const entries = status.split("\0").filter((entry) => entry !== "");
		const changes: GitChange[] = [];
		for (const entry of entries) {
			const path = entry.slice(3);
			// An untracked or renamed file is no stamp, and `discard` could not restore it.
			const tracked = /^[ MT][ MT]$/.test(entry.slice(0, 2));
			const diff = tracked
				? await this.out("diff", "-U0", "HEAD", "--", path)
				: "";
			const touched = diff
				.split("\n")
				.filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line));
			changes.push({
				path,
				versionOnly:
					tracked &&
					touched.length > 0 &&
					touched.every((line) => /^[+-]\s*"?version"?\s*[:=]/.test(line)),
			});
		}
		return changes;
	}

	async commitAll(message: string): Promise<void> {
		if (await this.clean()) {
			return;
		}
		await this.out("commit", "--all", "--message", message);
	}

	async tag(tag: string): Promise<void> {
		const { exitCode } = await this.run(
			"rev-parse",
			"--verify",
			"--quiet",
			`refs/tags/${tag}`,
		);
		if (exitCode === 0) {
			return; // a resumed release finds its own tag already here
		}
		await this.out("tag", tag);
	}

	async push(ref: string): Promise<void> {
		await this.out("push", "origin", ref);
	}

	async remoteTags(pattern: string): Promise<string[]> {
		const out = await this.out(
			"ls-remote",
			"--tags",
			"--refs",
			"origin",
			pattern,
		);
		return out
			.split("\n")
			.filter((line) => line !== "")
			.map((line) => line.replace(/^\S+\trefs\/tags\//, ""));
	}

	private run(...args: string[]) {
		return this.ps.spawnCapture(["git", "-C", this.root, ...args]);
	}

	private async out(...args: string[]): Promise<string> {
		const { exitCode, stdout, stderr } = await this.run(...args);
		if (exitCode !== 0) {
			throw new Error(
				`git ${args.join(" ")}: ${stderr.trim() || stdout.trim()}`,
			);
		}
		return stdout.trim();
	}
}
