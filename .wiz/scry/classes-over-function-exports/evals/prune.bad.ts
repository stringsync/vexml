import { Command } from "commander";
import { NodeFs, type Fs } from "./fs.ts";
import { ConsoleLogger, type Logger } from "./logger.ts";

export class Prune {
	private fs: Fs;
	private log: Logger;

	constructor(deps: { fs?: Fs; log?: Logger } = {}) {
		this.fs = deps.fs ?? new NodeFs();
		this.log = deps.log ?? new ConsoleLogger();
	}

	async run(opts: { olderThanDays: number }): Promise<void> {
		const cutoff = Date.now() - opts.olderThanDays * 86_400_000;
		for (const entry of await this.fs.list(".cache")) {
			if (entry.modifiedAt < cutoff) {
				await this.fs.remove(entry.path);
				this.log.info(`removed ${entry.path}`);
			}
		}
	}
}

export const pruneCommand = new Command("prune")
	.option("--older-than-days <n>", "age in days", Number, 30)
	.action((opts) => new Prune().run(opts));
