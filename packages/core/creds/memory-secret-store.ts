import type { Resource } from "core/disposable";
import { credentialName } from "./credential-source";
import type { SecretStore } from "./secret-store";

/**
 * A store whose values live only in this process's memory: never written to
 * disk, the environment, argv or a log, and gone when the process is. For a
 * daemon handed keys over a socket that must not outlive it, such as a worker
 * holding an agent's API key for the length of a task. `clear()` drops every
 * value at once, and `dispose()` does the same, so it can sit in a disposer.
 *
 * The values sit in a private field, so neither `console.log`,
 * `Bun.inspect` nor `JSON.stringify` of the store shows one; its label and
 * errors never hold one either. JavaScript cannot wipe a string, so a dropped
 * value lingers in the heap until the garbage collector reuses its memory:
 * pair it with `makeUndumpable()` from `core/system`, so no other
 * process can read that memory meanwhile.
 */
export class MemorySecretStore implements SecretStore, Resource {
	readonly #values = new Map<string, string>();

	constructor(readonly label = "this process's memory") {}

	async get(name: string): Promise<string | undefined> {
		return this.#values.get(name);
	}

	async set(name: string, value: string): Promise<void> {
		this.#values.set(credentialName(name), value);
	}

	async delete(name: string): Promise<boolean> {
		return this.#values.delete(name);
	}

	async names(): Promise<string[]> {
		return [...this.#values.keys()].toSorted();
	}

	/** Drops every value it keeps. */
	clear(): void {
		this.#values.clear();
	}

	dispose(): void {
		this.clear();
	}

	/** Its label and the names it keeps, never a value. */
	toJSON(): { label: string; names: string[] } {
		return { label: this.label, names: [...this.#values.keys()].toSorted() };
	}
}
