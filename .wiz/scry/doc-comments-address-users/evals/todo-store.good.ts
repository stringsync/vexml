import { rename, writeFile } from "node:fs/promises";

export interface TodoState {
	id: number;
	subject: string;
	position: number;
}

/** The todos of a project, one JSON file each, in the order they will be done. */
export class TodoStore {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(private readonly dir: string) {}

	/** Puts a todo at `position`, 1 at the top, and numbers the rest around it. */
	async move(state: TodoState, position: number): Promise<void> {
		await this.locked(() => this.save({ ...state, position }));
	}

	/**
	 * @internal Writes one todo to a temporary file and renames it over the
	 * old one, so a reader never sees half a file. Callers hold the lock.
	 */
	async save(state: TodoState): Promise<void> {
		const path = `${this.dir}/${state.id}.json`;
		const tmp = `${path}.${crypto.randomUUID()}.tmp`;
		await writeFile(tmp, `${JSON.stringify(state)}\n`);
		await rename(tmp, path);
	}

	/** @internal Chains writes on one promise, since two moves at once would renumber from stale positions. */
	async locked<T>(work: () => Promise<T>): Promise<T> {
		const next = this.queue.then(work);
		this.queue = next.catch(() => {});
		return next;
	}
}
