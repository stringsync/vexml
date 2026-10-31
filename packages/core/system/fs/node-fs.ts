import { watch } from "node:fs";
import fs from "node:fs/promises";
import { join, normalize } from "node:path";
import type { Resource } from "core/disposable";
import type {
	Fs,
	MkdirOptions,
	RmOptions,
	StatResult,
	WatchOptions,
} from "./fs";

export class NodeFs implements Fs {
	async exists(path: string): Promise<boolean> {
		return fs.access(normalize(path)).then(
			() => true,
			() => false,
		);
	}

	async mkdir(path: string, opts?: MkdirOptions): Promise<void> {
		await fs.mkdir(normalize(path), {
			recursive: opts?.recursive ?? true,
		});
	}

	read(path: string): Promise<string> {
		return fs.readFile(normalize(path), "utf-8");
	}

	write(path: string, data: string): Promise<void> {
		return fs.writeFile(normalize(path), data);
	}

	append(path: string, data: string): Promise<void> {
		return fs.appendFile(normalize(path), data);
	}

	async readBytes(path: string): Promise<Uint8Array> {
		const buffer = await fs.readFile(normalize(path));
		return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	}

	writeBytes(path: string, data: Uint8Array): Promise<void> {
		return fs.writeFile(normalize(path), data);
	}

	rename(from: string, to: string): Promise<void> {
		return fs.rename(normalize(from), normalize(to));
	}

	readdir(path: string): Promise<string[]> {
		return fs.readdir(normalize(path));
	}

	chmod(path: string, mode: number): Promise<void> {
		return fs.chmod(normalize(path), mode);
	}

	stat(path: string): Promise<StatResult> {
		return fs.stat(normalize(path));
	}

	rm(path: string, opts?: RmOptions): Promise<void> {
		return fs.rm(normalize(path), opts);
	}

	isSymlink(path: string): Promise<boolean> {
		return fs.lstat(normalize(path)).then(
			(stat) => stat.isSymbolicLink(),
			() => false,
		);
	}

	watch(
		path: string,
		onChange: (changed: string) => void,
		opts?: WatchOptions,
	): Resource {
		const root = normalize(path);
		const watcher = watch(
			root,
			{ recursive: opts?.recursive ?? false },
			(_event, name) => onChange(name ? join(root, String(name)) : root),
		);
		// A watched directory that goes away ends the watch rather than the
		// process.
		watcher.on("error", () => watcher.close());
		return { dispose: () => watcher.close() };
	}
}
