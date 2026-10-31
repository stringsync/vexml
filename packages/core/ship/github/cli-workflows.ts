import { NodePs, type Ps } from "core/system";
import { ghLogin } from "./login";
import type { WorkflowRun, Workflows } from "./workflows";

/** What a `CliWorkflows` spawns through; the real process by default. */
export interface CliWorkflowsOptions {
	/**
	 * The repository the workflows run in, as `owner/name`; the one the working
	 * directory checks out by default.
	 */
	repo?: string;
	ps?: Ps;
}

/** GitHub Actions workflows, via the `gh` CLI. */
export class CliWorkflows implements Workflows {
	private readonly ps: Ps;
	private readonly named?: string;

	constructor(opts: CliWorkflowsOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
		this.named = opts.repo;
	}

	repo(): Promise<string> {
		if (this.named !== undefined) {
			return Promise.resolve(this.named);
		}
		return this.gh(
			["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
			false,
		);
	}

	async registered(file: string): Promise<boolean> {
		await ghLogin(this.ps);
		const { exitCode, stdout } = await this.ps.spawnCapture([
			"gh",
			"api",
			`repos/${await this.repo()}/actions/workflows/${file}`,
			"--jq",
			".state",
		]);
		// A workflow GitHub has yet to see is a 404, which is an answer: not yet.
		return exitCode === 0 && stdout.trim() === "active";
	}

	async dispatch(
		file: string,
		branch: string,
		inputs: Record<string, string>,
	): Promise<void> {
		await this.gh([
			"workflow",
			"run",
			file,
			"--ref",
			branch,
			...Object.entries(inputs).flatMap(([key, value]) => [
				"--field",
				`${key}=${value}`,
			]),
		]);
	}

	async runs(file: string, sha: string): Promise<WorkflowRun[]> {
		const out = await this.gh([
			"run",
			"list",
			"--workflow",
			file,
			"--commit",
			sha,
			"--json",
			"databaseId,url,status,conclusion,attempt",
			"--limit",
			"10",
		]);
		const found: Array<{
			databaseId: number;
			url: string;
			status: string;
			conclusion: string;
			attempt: number;
		}> = JSON.parse(out || "[]");
		return found.map((run) => ({
			id: String(run.databaseId),
			url: run.url,
			status: run.status,
			...(run.conclusion === "" ? {} : { conclusion: run.conclusion }),
			attempt: run.attempt,
		}));
	}

	async rerun(id: string, failedOnly: boolean): Promise<void> {
		await this.gh(["run", "rerun", id, ...(failedOnly ? ["--failed"] : [])]);
	}

	async failedLog(id: string): Promise<string> {
		return this.gh(["run", "view", id, "--log-failed"], false);
	}

	/** Runs gh, logging in first when `login` says to; throws on a nonzero exit. */
	private async gh(args: string[], login = true): Promise<string> {
		if (login) {
			await ghLogin(this.ps);
		}
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture([
			"gh",
			...args,
			...(this.named === undefined ? [] : ["--repo", this.named]),
		]);
		if (exitCode !== 0) {
			throw new Error(
				`gh ${args.slice(0, 2).join(" ")}: ${stderr.trim() || stdout.trim()}`,
			);
		}
		return stdout.trim();
	}
}
