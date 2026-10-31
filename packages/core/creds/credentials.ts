import type { CredentialSource } from "./credential-source";

/**
 * An app's credentials, each named the way its environment variable is, read
 * from the sources the caller lists, first one with a value wins. Which
 * sources is the caller's choice: the environment and a `.env` file where the
 * app is deployed, only the system's store on a person's machine, so a stray
 * export or a forgotten `.env` is never what a dev run reads. A source need
 * not list what it holds, so a caller names what it needs; a `SecretStore`
 * can also list its own.
 *
 * It is a source itself, so lists compose: a group of sources is one entry
 * in another list, and any object with a `label` and a `get`, such as one
 * over a hosted secrets manager, is a source too.
 */
export class Credentials implements CredentialSource {
	readonly label: string;

	constructor(readonly sources: readonly CredentialSource[]) {
		this.label = sources.map((source) => source.label).join(", or ");
	}

	/** The value of `name`, or undefined when no source has it. */
	async get(name: string): Promise<string | undefined> {
		for (const source of this.sources) {
			const value = await source.get(name);
			if (value !== undefined && value !== "") {
				return value;
			}
		}
		return undefined;
	}

	/**
	 * The value of `name`, or an error saying where it looked. The error never
	 * holds a value, so it is safe to show anyone.
	 */
	async require(name: string): Promise<string> {
		const value = await this.get(name);
		if (value === undefined) {
			throw new Error(
				this.sources.length === 0
					? `${name} is not set: these credentials read from no source`
					: `${name} is not set in ${this.label}`,
			);
		}
		return value;
	}

	/** The source `name` would be read from, without reading it out; undefined when none has it. */
	async source(name: string): Promise<CredentialSource | undefined> {
		for (const source of this.sources) {
			const value = await source.get(name);
			if (value !== undefined && value !== "") {
				return source;
			}
		}
		return undefined;
	}
}
