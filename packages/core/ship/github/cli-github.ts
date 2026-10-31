import { NodePs, type Ps } from "core/system";
import type { Github } from "./github";
import { ghLogin } from "./login";

/** GitHub releases, via the `gh` CLI. */
/** What a `CliGithub` spawns through; the real process by default. */
export interface CliGithubOptions {
	/**
	 * The repository the releases are on, as `owner/name`, such as a project's
	 * public mirror; the one `gh` finds from the working directory by default.
	 */
	repo?: string;
	ps?: Ps;
}

export class CliGithub implements Github {
	private readonly ps: Ps;
	/** `--repo <repo>` when a repository is named, so gh skips its own lookup. */
	private readonly on: string[];

	constructor(opts: CliGithubOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
		this.on = opts.repo === undefined ? [] : ["--repo", opts.repo];
	}

	/** Where the releases are, for a log line. */
	get repo(): string | undefined {
		return this.on[1];
	}

	/**
	 * Publishes release notes for `tag`, or leaves the existing ones alone,
	 * asking for a login first if gh has nobody.
	 */
	async release(tag: string): Promise<void> {
		await this.login();
		const existing = await this.ps.spawnCapture([
			"gh",
			"release",
			"view",
			tag,
			...this.on,
		]);
		if (existing.exitCode === 0) {
			return;
		}
		// --generate-notes writes the notes from the commits and PRs since the
		// previous tag, so nobody has to.
		const { exitCode, stderr } = await this.ps.spawnCapture([
			"gh",
			"release",
			"create",
			tag,
			"--generate-notes",
			...this.on,
		]);
		if (exitCode !== 0) {
			throw new Error(`gh release create ${tag}: ${stderr.trim()}`);
		}
	}

	/**
	 * The tag of the release GitHub marks latest. Reading asks for no login,
	 * since a status check is no time to stop for a browser.
	 */
	async latest(): Promise<string | undefined> {
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture([
			"gh",
			"release",
			"view",
			"--json",
			"tagName",
			"--jq",
			".tagName",
			...this.on,
		]);
		if (exitCode === 0) {
			return stdout.trim() || undefined;
		}
		if (stderr.includes("release not found")) {
			return undefined;
		}
		throw new Error(`gh release view: ${stderr.trim() || stdout.trim()}`);
	}

	private login(): Promise<void> {
		return ghLogin(this.ps);
	}
}
