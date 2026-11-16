/** How far a release moves the version. */
export type Bump = "patch" | "minor" | "major";

// Releases are plain major.minor.patch. Prereleases would need a policy for
// what happens to the other packages, and no repo here has asked for one.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * The newest of `versions`, or `undefined` when none is major.minor.patch.
 * Anything else is skipped, as a tag nobody cut with a release would be.
 */
export function newest(versions: readonly string[]): string | undefined {
	let best: { version: string; parts: number[] } | undefined;
	for (const version of versions) {
		const match = SEMVER.exec(version);
		if (match === null) {
			continue;
		}
		const parts = match.slice(1).map(Number);
		if (best === undefined || compare(parts, best.parts) > 0) {
			best = { version, parts };
		}
	}
	return best?.version;
}

function compare(left: number[], right: number[]): number {
	for (const [index, part] of left.entries()) {
		const diff = part - (right[index] ?? 0);
		if (diff !== 0) {
			return diff;
		}
	}
	return 0;
}

/** Returns `version` moved by `type`. */
export function bump(version: string, type: Bump): string {
	const parts = SEMVER.exec(version);
	if (parts === null) {
		throw new Error(
			`invalid version: "${version}" (expected major.minor.patch)`,
		);
	}
	const [major, minor, patch] = [
		Number(parts[1]),
		Number(parts[2]),
		Number(parts[3]),
	];
	switch (type) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
	}
}
