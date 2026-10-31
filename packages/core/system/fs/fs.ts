import type { Resource } from "core/disposable";
/**
 * Fs is the filesystem seam. Typically, this is assigned the variable name `fs`.
 */
export interface Fs {
	exists(path: string): Promise<boolean>;
	mkdir(path: string, opts?: MkdirOptions): Promise<void>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	/**
	 * Adds `data` to the end of the file, making it when it is missing, so a log
	 * grows without being rewritten whole.
	 */
	append(path: string, data: string): Promise<void>;
	readBytes(path: string): Promise<Uint8Array>;
	writeBytes(path: string, data: Uint8Array): Promise<void>;
	rename(from: string, to: string): Promise<void>;
	readdir(path: string): Promise<string[]>;
	stat(path: string): Promise<StatResult>;
	rm(path: string, opts?: RmOptions): Promise<void>;
	/** Sets `path`'s permission bits, such as 0o600 for its owner alone. */
	chmod(path: string, mode: number): Promise<void>;
	/**
	 * Whether `path` is itself a symbolic link, rather than what one points
	 * at; false when nothing is there.
	 */
	isSymlink(path: string): Promise<boolean>;
	/**
	 * Calls `onChange` with the path that changed, whenever something in
	 * `path` does, until the watch is disposed: a write, a rename, a removal.
	 * Throws when `path` cannot be watched, as when it does not exist.
	 */
	watch(
		path: string,
		onChange: (changed: string) => void,
		opts?: WatchOptions,
	): Resource;
}

export interface MkdirOptions {
	/**
	 * Defaults to true. Pass false for a create-or-throw: the failure is what
	 * makes `mkdir` usable as a mutex.
	 */
	recursive?: boolean;
}

export interface WatchOptions {
	/** Everything under `path` too, rather than its own entries alone. */
	recursive?: boolean;
}

export interface RmOptions {
	recursive?: boolean;
	force?: boolean;
}

export interface StatResult {
	isDirectory(): boolean;
	/** Bytes on disk. Zero for a directory. */
	size: number;
	/** When it was last written, as epoch ms. */
	mtimeMs: number;
	/** Permission bits, such as 0o755; a file's executable bit is `mode & 0o111`. */
	mode: number;
}
