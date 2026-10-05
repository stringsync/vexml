export interface Flags {
	dryRun: boolean;
	verbose: boolean;
	offset: number;
}

// Long-form flags only; short aliases confuse first-time users.
export function parseFlags(argv: string[]): Flags {
	const flags: Flags = { dryRun: false, verbose: false, offset: 0 };
	for (const arg of argv) {
		if (arg === "--dry-run") flags.dryRun = true;
		else if (arg === "--verbose") flags.verbose = true;
		else if (arg.startsWith("--offset=")) {
			flags.offset = Number(arg.slice("--offset=".length)) - 1;
		}
	}
	return flags;
}
