import { basename, dirname } from "node:path";
import { type Fs, NodePs, type Ps } from "core/system";
import { credentialName } from "./credential-source";
import type { SecretStore } from "./secret-store";

/** The entry each service lists its names under; no credential can have it. */
const NAMES = ".names";

/** What `SystemSecretStore.forProject` reads through; the real one by default. */
export interface ForProjectOptions {
	/** @deprecated Unused: the name no longer comes from config files. */
	fs?: Fs;
	ps?: Ps;
}

/**
 * The operating system's own store, through `Bun.secrets`: the Keychain on
 * macOS, Credential Manager on Windows, and on Linux whatever secret service
 * daemon is running, such as GNOME Keyring or KWallet. A project's values are
 * kept under the service `mono:<project>`, so each project's are its
 * own, and the device's under `mono`, for keys that belong to the person
 * rather than to one project. Encrypted at rest by the system. A headless
 * server often has no secret service, which is why a deployed app reads the
 * environment instead. The system cannot list a service's entries, so each
 * keeps one more, `.names`, listing the rest.
 */
export class SystemSecretStore implements SecretStore {
	readonly label: string;

	private constructor(
		/** The service its values are kept under. */
		readonly service: string,
	) {
		const system =
			process.platform === "darwin"
				? "the macOS Keychain"
				: process.platform === "win32"
					? "Windows Credential Manager"
					: "the system's secret service";
		this.label = `${system} as "${service}"`;
	}

	/** The store of the project named `project`, kept as `mono:<project>`. */
	static project(project: string): SystemSecretStore {
		return new SystemSecretStore(`mono:${project}`);
	}

	/**
	 * The store of the project around `dir` (the working directory by
	 * default). Its name is the directory of the
	 * repository's main worktree, so a value added from one git worktree is
	 * there in every other.
	 */
	static async forProject(
		dir?: string,
		opts: ForProjectOptions = {},
	): Promise<SystemSecretStore> {
		return SystemSecretStore.project(await projectName(dir, opts));
	}

	/** The device's store, kept as `mono`, shared by every project. */
	static device(): SystemSecretStore {
		return new SystemSecretStore("mono");
	}

	async get(name: string): Promise<string | undefined> {
		const value = await Bun.secrets.get({ service: this.service, name });
		return value ?? undefined;
	}

	async set(name: string, value: string): Promise<void> {
		await Bun.secrets.set({
			service: this.service,
			name: credentialName(name),
			value,
		});
		const names = await this.names();
		if (!names.includes(name)) {
			await this.list([...names, name]);
		}
	}

	async delete(name: string): Promise<boolean> {
		const deleted = await Bun.secrets.delete({
			service: this.service,
			name: credentialName(name),
		});
		const names = await this.names();
		if (names.includes(name)) {
			await this.list(names.filter((kept) => kept !== name));
		}
		return deleted;
	}

	async names(): Promise<string[]> {
		const list = await Bun.secrets.get({ service: this.service, name: NAMES });
		return (list ?? "").split("\n").filter((name) => name !== "");
	}

	/** Keeps `names` as its list, sorted, or none when empty. */
	private async list(names: string[]): Promise<void> {
		if (names.length === 0) {
			await Bun.secrets.delete({ service: this.service, name: NAMES });
		} else {
			await Bun.secrets.set({
				service: this.service,
				name: NAMES,
				value: names.toSorted().join("\n"),
			});
		}
	}
}

/**
 * What the project around `dir` is called on this device, which its
 * credentials and anything else kept outside it go under: the directory of
 * the repository's main worktree, so every worktree shares it.
 */
export async function projectName(
	dir: string | undefined,
	opts: ForProjectOptions = {},
): Promise<string> {
	const ps = opts.ps ?? new NodePs();
	const from = dir ?? ps.cwd();
	const { stdout, exitCode } = await ps.spawnCapture([
		"git",
		"-C",
		from,
		"rev-parse",
		"--path-format=absolute",
		"--show-toplevel",
		"--git-common-dir",
	]);
	const [_root, common] = exitCode === 0 ? stdout.trim().split("\n") : [];
	return basename(common === undefined ? from : dirname(common));
}
