import { open, type FileHandle } from "node:fs/promises";

export class LogTailer {
	private handle: FileHandle | undefined;
	private offset = 0;

	constructor(private readonly path: string) {}

	async next(): Promise<string> {
		this.handle ??= await open(this.path, "r");
		const buffer = Buffer.alloc(4096);
		const { bytesRead } = await this.handle.read(buffer, 0, buffer.length, this.offset);
		this.offset += bytesRead;
		return buffer.subarray(0, bytesRead).toString("utf8");
	}

	async close(): Promise<void> {
		await this.handle?.close();
		this.handle = undefined;
	}
}
