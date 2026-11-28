import type { Bump } from "../target";

/** Clean semver (`major.minor.patch`, with optional prerelease, no `v` prefix or build metadata). */
const SEMVER =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?$/;

/** Whether `version` is a clean semantic version npm can publish as-is. */
export function isSemver(version: string): boolean {
	return SEMVER.test(version);
}

/** `version` raised by `bump`, as npm's semver does for a release. */
export function next(version: string, bump: Bump): string {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
	if (!match) {
		throw new Error(`"${version}" is not a version to bump`);
	}
	const [major, minor, patch] = match.slice(1).map(Number) as [
		number,
		number,
		number,
	];
	switch (bump) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
	}
}
