import { type Fs, NodeFs } from "core/system";
import type { CredentialSource } from "./credential-source";

/** Where `DotenvFile` reads; the real filesystem by default. */
export interface DotenvFileOptions {
	fs?: Fs;
}

/**
 * A `.env` file of `NAME=value` lines, read once, on the first `get`. A
 * missing file has nothing, rather than failing, so a deploy without one
 * falls through to the next source. Values may be quoted, a line may start
 * with `export`, and `#` starts a comment outside quotes. Variables are not
 * expanded.
 */
export class DotenvFile implements CredentialSource {
	readonly label: string;
	private fs: Fs;
	private values?: Promise<Map<string, string>>;

	constructor(
		readonly path: string,
		opts: DotenvFileOptions = {},
	) {
		this.fs = opts.fs ?? new NodeFs();
		this.label = path;
	}

	async get(name: string): Promise<string | undefined> {
		this.values ??= this.read();
		const value = (await this.values).get(name);
		return value === "" ? undefined : value;
	}

	private async read(): Promise<Map<string, string>> {
		if (!(await this.fs.exists(this.path))) {
			return new Map();
		}
		return parse(await this.fs.read(this.path));
	}
}

const LINE =
	/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'([^']*)'|([^#\r\n]*?))\s*(?:#.*)?$/;

function parse(text: string): Map<string, string> {
	const values = new Map<string, string>();
	for (const line of text.split(/\r?\n/)) {
		const match = LINE.exec(line);
		if (match === null) {
			continue;
		}
		const [, name, doubled, single, bare] = match;
		const value =
			doubled !== undefined
				? doubled.replace(/\\n/g, "\n").replace(/\\(["\\])/g, "$1")
				: (single ?? bare ?? "");
		values.set(name as string, value);
	}
	return values;
}
