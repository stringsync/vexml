import { basename } from "node:path";
import { NodePs, type Ps } from "core/system";
import { CliGit } from "../git/cli-git";
import type { Git } from "../git/git";
import { CliWorkflows } from "../github/cli-workflows";
import type { Workflows } from "../github/workflows";
import { PUBLISH_WORKFLOW_PATH } from "../publish-workflow";
import type { CheckReport } from "../step";

/** How many lines of a failed run's log an error carries. */
const LOG_LINES = 20;

/** Pass `git` or `workflows` to run `GithubActions` against fakes in tests; the real ones by default. */
export interface GithubActionsOptions {
	git?: Git;
	workflows?: Workflows;
	ps?: Ps;
	/**
	 * What a refused run says to run to set up npm's trust, which calls
	 * `Release.trust()`; `bunx @webappwiz/cli ship trust` by default.
	 */
	trustCommand?: string;
	/**
	 * The repository the workflow runs in, as `owner/name`; the one the
	 * working directory checks out by default. Set it with `use` for a
	 * workflow in a mirror's repository.
	 */
	repo?: string;
}

/** Use it as `releases.npm`'s `via`: `githubActions()` makes one. */
export function githubActions(opts: GithubActionsOptions = {}): GithubActions {
	return new GithubActions(opts);
}

/**
 * Publishes by running the generated publish workflow on GitHub Actions, where
 * npm trusts the job, rather than from this machine. It pushes the release
 * commit, starts the workflow on it, and follows the run; whether a version
 * went out is still the registry's to say, never the run's green check.
 *
 * A release has one run for all its packages, found again by its commit: a
 * second package reuses it, and a resumed release reuses a run still going or
 * finished, and reruns one that failed.
 */
export class GithubActions {
	/** The workflow's file name, as npm's trusted publisher entry names it. */
	readonly file = basename(PUBLISH_WORKFLOW_PATH);
	private git: Git;
	private readonly workflows: Workflows;
	/** The attempt of the run a rerun started from, whose result is stale until a newer one shows. */
	private rerunFrom?: { id: string; attempt: number };
	private readonly trustCommand: string;

	constructor(opts: GithubActionsOptions = {}) {
		const ps = opts.ps ?? new NodePs();
		this.git = opts.git ?? new CliGit(ps.cwd(), { ps });
		this.workflows =
			opts.workflows ?? new CliWorkflows({ ps, repo: opts.repo });
		this.trustCommand = opts.trustCommand ?? "bunx @webappwiz/cli ship trust";
	}

	/**
	 * Has the run start from the checkout `git` works in, whose branch it
	 * pushes and whose commit it publishes: a mirror's, once it is built.
	 */
	use(git: Git): void {
		this.git = git;
	}

	/** The repository the workflow runs in, as `owner/name`. */
	repo(): Promise<string> {
		return this.workflows.repo();
	}

	/**
	 * Gets a run going for the release commit: pushes the branch so GitHub has
	 * the commit, then starts the workflow, reruns its failed run, or leaves
	 * the run it has alone. Returns once that is asked, not once it ends.
	 */
	async start(): Promise<void> {
		const branch = await this.git.branch();
		await this.git.push(branch);
		const sha = await this.git.head();
		const [latest] = await this.workflows.runs(this.file, sha);
		if (latest === undefined) {
			await this.workflows.dispatch(this.file, branch, { ref: sha });
			return;
		}
		if (latest.status === "completed" && latest.conclusion !== "success") {
			this.rerunFrom = { id: latest.id, attempt: latest.attempt };
			// A cancelled or timed out run left jobs unrun that a failed-only
			// rerun would skip.
			await this.workflows.rerun(latest.id, latest.conclusion === "failure");
		}
	}

	/**
	 * Where the run stands, as a step check reads it: passed once it succeeded,
	 * throwing when it ended any other way, and otherwise its status and page.
	 * `live` says whether the registry already serves the package, which is
	 * all that passes a release that never started a run.
	 */
	async watch(name: string, live: boolean): Promise<CheckReport> {
		const [run] = await this.workflows.runs(this.file, await this.git.head());
		if (run === undefined) {
			return live ? { passed: true } : { passed: false, status: "waiting" };
		}
		const { url } = run;
		if (run.status !== "completed") {
			return { passed: false, status: run.status, url };
		}
		if (
			this.rerunFrom?.id === run.id &&
			run.attempt <= this.rerunFrom.attempt
		) {
			// GitHub still shows the attempt that failed.
			return { passed: false, status: "queued", url };
		}
		if (run.conclusion === "success") {
			return { passed: true, url };
		}
		throw new Error(await this.failure(name, run.id, url, run.conclusion));
	}

	private async failure(
		name: string,
		id: string,
		url: string,
		conclusion: string | undefined,
	): Promise<string> {
		const log = await this.workflows.failedLog(id);
		const tail = log.split("\n").slice(-LOG_LINES).join("\n");
		const refused = /OIDC token exchange/i.test(log)
			? `\n${await this.setup(name)}`
			: "";
		return `the publish run ${conclusion ?? "ended"}: ${url}\n${tail}${refused}`;
	}

	/** What to run for npm to trust the workflow, once per package. */
	private async setup(name: string): Promise<string> {
		const repo = await this.workflows.repo();
		return [
			`npm refused the run: ${name} has no trusted publisher entry for it. Run \`${this.trustCommand}\` to set one up for every package, or for this one alone:`,
			`  npm trust github ${name} --repo ${repo} --file ${this.file} --allow-publish`,
			"The package must already exist. A new entry lapses after about two days unless a publish uses it. Then ship again to rerun the failed run.",
		].join("\n");
	}
}
