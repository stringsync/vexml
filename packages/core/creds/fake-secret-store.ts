import type { SecretStore } from "./secret-store";

/** A store that is a map, so a test can say what is kept and see what changed. */
export class FakeSecretStore implements SecretStore {
	readonly values: Map<string, string>;

	constructor(
		values: Record<string, string> = {},
		readonly label = "a fake store",
	) {
		this.values = new Map(Object.entries(values));
	}

	async get(name: string): Promise<string | undefined> {
		return this.values.get(name);
	}

	async set(name: string, value: string): Promise<void> {
		this.values.set(name, value);
	}

	async delete(name: string): Promise<boolean> {
		return this.values.delete(name);
	}

	async names(): Promise<string[]> {
		return [...this.values.keys()].toSorted();
	}
}
