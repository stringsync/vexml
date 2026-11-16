import type { Package } from "../workspace/workspace";
import type {
	Publication,
	PublishRegistryOptions,
	Registry,
	StagedPackage,
} from "./registry";

/** A test registry whose published versions and publish calls are easy to set and read. */
export class FakeRegistry implements Registry {
	/** Entries read `name@version`. */
	readonly has = new Set<string>();
	readonly publishes: string[] = [];
	/** Directories whose publish the registry took already, answering a retry with `already`. */
	readonly accepted = new Set<string>();
	/** Name to the version installs get, as `latest` reads on npm. */
	readonly latest = new Map<string, string>();
	fails?: string;
	/** Makes `publish` stage, reporting this for each directory. */
	staging?: (dir: string) => StagedPackage;

	/** Names `trust` was asked for, in order. */
	readonly trusts: string[] = [];
	/** Names whose `trust` throws. */
	readonly untrustable = new Set<string>();

	/** Set once `trusted()` is asked for: publishes then go out unstaged, as CI's do. */
	viaTrust = false;

	get staged(): boolean {
		return this.staging !== undefined && !this.viaTrust;
	}

	trusted(): Registry {
		this.viaTrust = true;
		return this;
	}

	/** Each pack, as `<dir> -> <into>`. */
	readonly packs: string[] = [];

	async pack(dir: string, into: string): Promise<void> {
		this.packs.push(`${dir} -> ${into}`);
	}

	async published(name: string, version: string): Promise<boolean> {
		return this.has.has(`${name}@${version}`);
	}

	async deployed(name: string): Promise<string | undefined> {
		return this.latest.get(name);
	}

	/** Makes `redeploys` true, as a stack registry's is. */
	redeploys?: boolean;
	/** The options of each publish, in order. */
	readonly options: (PublishRegistryOptions | undefined)[] = [];

	async publish(
		dir: string,
		opts?: PublishRegistryOptions,
	): Promise<Publication> {
		this.options.push(opts);
		if (dir === this.fails) {
			throw new Error(`publish failed in ${dir}`);
		}
		if (this.accepted.has(dir)) {
			return { already: true };
		}
		this.publishes.push(dir);
		const staged = this.viaTrust ? undefined : this.staging?.(dir);
		return staged === undefined ? {} : { staged };
	}

	async trust(name: string): Promise<void> {
		this.trusts.push(name);
		if (this.untrustable.has(name)) {
			throw new Error(`${name} refused`);
		}
	}

	/** Name to the reason `verify` refuses it with. */
	readonly refuses = new Map<string, string>();
	/** The names `verify` was asked about, in order. */
	readonly verified: string[] = [];

	async verify({ name }: Package): Promise<void> {
		this.verified.push(name);
		const reason = this.refuses.get(name);
		if (reason !== undefined) {
			throw new Error(reason);
		}
	}

	page(name: string, version: string): string {
		return `https://registry/${name}/v/${version}`;
	}
}
