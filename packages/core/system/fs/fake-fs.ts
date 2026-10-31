import { dirname, normalize, resolve } from "node:path";
import type { Resource } from "core/disposable";
import type {
	Fs,
	MkdirOptions,
	RmOptions,
	StatResult,
	WatchOptions,
} from "./fs";

const DIRECTORY = Symbol("directory");

/** An in-memory {@link Fs} for tests. */
export class FakeFs implements Fs {
	readonly store = new Map<string, string | Uint8Array | typeof DIRECTORY>();
	/** Each symbolic link, to the path it points at, as `symlink` was given it. */
	private readonly links = new Map<string, string>();
	/** When each path was last written, as epoch ms, for `stat`. */
	private readonly modified = new Map<string, number>();
	private readonly modes = new Map<string, number>();
	private readonly watches = new Set<{
		root: string;
		recursive: boolean;
		onChange: (changed: string) => void;
	}>();

	async exists(path: string): Promise<boolean> {
		return this.store.has(this.follow(path));
	}

	/**
	 * Makes `path` a symbolic link to `target`, which is taken from `path`'s
	 * directory when relative, as a real one is. Reading through it reads the
	 * target.
	 */
	async symlink(target: string, path: string): Promise<void> {
		const link = normalize(path);
		this.links.set(link, target);
		await this.mkdir(dirname(link));
	}

	async isSymlink(path: string): Promise<boolean> {
		return this.links.has(normalize(path));
	}

	async mkdir(path: string, opts?: MkdirOptions): Promise<void> {
		const target = normalize(path);
		if (opts?.recursive === false && this.store.has(target)) {
			throw new Error(`Path already exists: ${path}`);
		}
		this.store.set(target, DIRECTORY);
		this.changed(target);
		if (opts?.recursive !== false) {
			// every missing ancestor too, as `mkdir -p` makes them
			for (
				let dir = dirname(target);
				!this.store.has(dir);
				dir = dirname(dir)
			) {
				this.store.set(dir, DIRECTORY);
				if (dir === dirname(dir)) {
					break;
				}
			}
		}
	}

	async read(path: string): Promise<string> {
		const content = this.file(path);
		return typeof content === "string"
			? content
			: new TextDecoder().decode(content);
	}

	async write(path: string, data: string): Promise<void> {
		this.store.set(normalize(path), data);
		this.changed(normalize(path));
	}

	async append(path: string, data: string): Promise<void> {
		const target = normalize(path);
		const content = this.store.get(target);
		if (content === DIRECTORY) {
			throw new Error(`Path is a directory: ${path}`);
		}
		this.store.set(
			target,
			content === undefined
				? data
				: typeof content === "string"
					? content + data
					: new TextDecoder().decode(content) + data,
		);
		this.changed(target);
	}

	async readBytes(path: string): Promise<Uint8Array> {
		const content = this.file(path);
		return typeof content === "string"
			? new TextEncoder().encode(content)
			: content.slice();
	}

	async writeBytes(path: string, data: Uint8Array): Promise<void> {
		this.store.set(normalize(path), data.slice());
		this.changed(normalize(path));
	}

	async chmod(path: string, mode: number): Promise<void> {
		if (!(await this.exists(path))) {
			throw new Error(`Path does not exist: ${path}`);
		}
		this.modes.set(normalize(path), mode);
	}

	async rename(from: string, to: string): Promise<void> {
		const source = normalize(from);
		const entry = this.store.get(source);
		if (entry === undefined) {
			throw new Error(`Path does not exist: ${from}`);
		}
		const target = normalize(to);
		// a directory takes everything under it along, as a real rename does
		for (const [key, value] of [...this.store]) {
			if (key === source || key.startsWith(`${source}/`)) {
				this.store.delete(key);
				this.store.set(target + key.slice(source.length), value);
			}
		}
		this.changed(source);
		this.changed(target);
	}

	async readdir(path: string): Promise<string[]> {
		const dir = this.follow(path);
		return [...this.store.keys(), ...this.links.keys()]
			.filter((key) => key !== dir && dirname(key) === dir)
			.map((key) => key.slice(dir.endsWith("/") ? dir.length : dir.length + 1));
	}

	async stat(path: string): Promise<StatResult> {
		const entry = this.store.get(this.follow(path));
		if (entry === undefined) {
			throw new Error(`Path does not exist: ${path}`);
		}
		return {
			isDirectory: () => entry === DIRECTORY,
			size: entry === DIRECTORY ? 0 : Buffer.byteLength(entry),
			mtimeMs: this.modified.get(this.follow(path)) ?? 0,
			mode:
				this.modes.get(this.follow(path)) ??
				(entry === DIRECTORY ? 0o755 : 0o644),
		};
	}

	async rm(path: string, opts?: RmOptions): Promise<void> {
		const target = normalize(path);
		if (this.links.delete(target)) {
			// the link goes, never what it points at, as a real rm does
			this.changed(target);
			return;
		}
		if (!opts?.force && !this.store.has(target)) {
			throw new Error(`Path does not exist: ${path}`);
		}
		this.store.delete(target);
		if (opts?.recursive) {
			for (const key of this.store.keys()) {
				if (key.startsWith(`${target}/`)) {
					this.store.delete(key);
				}
			}
		}
		this.changed(target);
	}

	watch(
		path: string,
		onChange: (changed: string) => void,
		opts?: WatchOptions,
	): Resource {
		const root = normalize(path);
		if (!this.store.has(root)) {
			throw new Error(`Path does not exist: ${path}`);
		}
		const watch = { root, recursive: opts?.recursive ?? false, onChange };
		this.watches.add(watch);
		return { dispose: () => this.watches.delete(watch) };
	}

	/** Tells each watch whose reach `path` is in, as a real one would. */
	private changed(path: string): void {
		this.modified.set(path, Date.now());
		for (const { root, recursive, onChange } of this.watches) {
			if (
				path === root ||
				dirname(path) === root ||
				(recursive && path.startsWith(`${root}/`))
			) {
				onChange(path);
			}
		}
	}

	/** `path` with every link along it swapped for where it points. */
	private follow(path: string): string {
		let at = normalize(path);
		for (let hops = 0; hops < 40; hops++) {
			const link = [...this.links.keys()].find(
				(each) => at === each || at.startsWith(`${each}/`),
			);
			if (link === undefined) {
				return at;
			}
			const target = resolve(dirname(link), this.links.get(link) as string);
			at = target + at.slice(link.length);
		}
		throw new Error(`Too many levels of symbolic links: ${path}`);
	}

	private file(path: string): string | Uint8Array {
		const content = this.store.get(this.follow(path));
		if (content === undefined || content === DIRECTORY) {
			throw new Error(`File does not exist: ${path}`);
		}
		return content;
	}
}
