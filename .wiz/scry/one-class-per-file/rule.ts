import type { Declaration, Finding, Rule, SourceFile } from "@webappwiz/scry";

/** Finds every top-level class but the one a file is named for. */
export default class OneClassPerFile implements Rule {
	static readonly description = "A file declares one top-level class.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	async check(file: SourceFile): Promise<Finding[]> {
		const classes = file.ts.topLevelClasses();
		const own = this.namedForTheFile(file, classes) ?? classes[0];
		return classes
			.filter((declared) => declared !== own)
			.map((declared) =>
				declared.flag(`Give ${declared.name} a file of its own.`),
			);
	}

	/** `RateLimiter` in `rate-limiter.ts`; the first class, when none is. */
	private namedForTheFile(
		file: SourceFile,
		classes: Declaration[],
	): Declaration | undefined {
		const stem = squash(file.stem);
		return classes.find((declared) => squash(declared.name) === stem);
	}
}

/** A name with its case and punctuation dropped, to compare across conventions. */
function squash(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
