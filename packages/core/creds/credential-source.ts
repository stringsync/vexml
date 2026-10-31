/**
 * Somewhere a credential's value can come from, by its environment variable
 * name. `Credentials` reads a list of them in order, and the caller picks
 * which: the environment and a `.env` file where the app is deployed, the
 * system's store on a person's machine.
 */
export interface CredentialSource {
	/** What a person calls it, as in "the environment" or "the macOS Keychain". */
	readonly label: string;
	/** The value it has for `name`, or undefined when it has none. */
	get(name: string): Promise<string | undefined>;
}

/**
 * `name`, when it can be an environment variable's: letters, digits and
 * `_`, not starting with a digit. Throws otherwise, so a store never keeps a
 * value no environment could hold, and its own bookkeeping, under names
 * that cannot be these, is safe from a credential's.
 */
export function credentialName(name: string): string {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
		throw new Error(
			`${JSON.stringify(name)} is not an environment variable name: use letters, digits and _, not starting with a digit`,
		);
	}
	return name;
}
