/** One run of a GitHub Actions workflow, as its latest attempt stands. */
export interface WorkflowRun {
	readonly id: string;
	/** The run's page on GitHub. */
	readonly url: string;
	/** `queued`, `in_progress` or `completed`, as GitHub says them. */
	readonly status: string;
	/** How a completed run ended, such as `success` or `failure`. */
	readonly conclusion?: string;
	/** Which try of the run this is; a rerun makes the next. */
	readonly attempt: number;
}

/** The GitHub Actions workflows a release dispatches and watches. */
export interface Workflows {
	/** The repository as `owner/name`. */
	repo(): Promise<string>;
	/** Starts the workflow file on `branch`, handing it `inputs`. */
	dispatch(
		file: string,
		branch: string,
		inputs: Record<string, string>,
	): Promise<void>;
	/** Runs of the workflow file at commit `sha`, newest first. */
	runs(file: string, sha: string): Promise<WorkflowRun[]>;
	/** Starts the run again: only its failed jobs, or all of them. */
	rerun(id: string, failedOnly: boolean): Promise<void>;
	/** What the run's failed steps printed. */
	failedLog(id: string): Promise<string>;
}
