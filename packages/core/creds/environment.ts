import { NodePs, type Ps } from "core/system";
import type { CredentialSource } from "./credential-source";

/** Where `Environment` reads; the real process by default. */
export interface EnvironmentOptions {
	ps?: Ps;
}

/**
 * The process's environment variables, the way CI, containers and hosting
 * platforms hand a deployed app its secrets. An empty value counts as none.
 * Bun loads a project's `.env` files into the environment itself, so under
 * Bun this reads them too.
 */
export class Environment implements CredentialSource {
	readonly label = "the environment";
	private ps: Ps;

	constructor(opts: EnvironmentOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
	}

	async get(name: string): Promise<string | undefined> {
		const value = this.ps.env(name);
		return value === "" ? undefined : value;
	}
}
