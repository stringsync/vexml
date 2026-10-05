export interface WriteOptions {
	encoding?: string;
	mode?: number;
}

export function write(path: string, data: string, opts: WriteOptions): void {
	files.write(path, data, opts.encoding ?? "utf8");
}
