import type { WorkflowRun, Workflows } from "./workflows";

/** Workflows whose runs a test sets, remembering every dispatch and rerun. */
export class FakeWorkflows implements Workflows {
	name = "owner/repo";
	/** Newest first, whatever the file and commit asked for. */
	runList: WorkflowRun[] = [];
	readonly dispatches: Array<{
		file: string;
		branch: string;
		inputs: Record<string, string>;
	}> = [];
	readonly reruns: Array<{ id: string; failedOnly: boolean }> = [];
	log = "";
	/** Set it to fail every dispatch, as gh does when the workflow is not on the branch. */
	error?: Error;
	/** How many asks `registered` answers no to before it says yes; as GitHub does while it registers a new workflow. */
	unregisteredAsks = 0;

	async repo(): Promise<string> {
		return this.name;
	}

	async registered(): Promise<boolean> {
		if (this.unregisteredAsks > 0) {
			this.unregisteredAsks -= 1;
			return false;
		}
		return true;
	}

	async dispatch(
		file: string,
		branch: string,
		inputs: Record<string, string>,
	): Promise<void> {
		if (this.error !== undefined) {
			throw this.error;
		}
		this.dispatches.push({ file, branch, inputs });
	}

	async runs(): Promise<WorkflowRun[]> {
		return this.runList;
	}

	async rerun(id: string, failedOnly: boolean): Promise<void> {
		this.reruns.push({ id, failedOnly });
	}

	async failedLog(): Promise<string> {
		return this.log;
	}
}
