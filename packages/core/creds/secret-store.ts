import type { CredentialSource } from "./credential-source";

/**
 * A source a person can also keep values in, so code that needs one does
 * not decide where it lives, and can list what it keeps. `SystemSecretStore` is the operating system's;
 * `FakeSecretStore` is a map for tests.
 */
export interface SecretStore extends CredentialSource {
	/** Keeps `value` under `name`, over whatever was there. */
	set(name: string, value: string): Promise<void>;
	/** Whether there was a value under `name` to delete. */
	delete(name: string): Promise<boolean>;
	/** Every name it keeps a value under, sorted. */
	names(): Promise<string[]>;
}
