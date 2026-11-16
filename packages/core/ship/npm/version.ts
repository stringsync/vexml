import type { Bump } from "../target";

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
