import type { Ps } from "core/system";

/** The trailer of a mirror commit naming the mono commit it was built from. */
export const TRAILER = "Mirrored-from";

/**
 * Refuses to build over commits the mirror did not make. The mirror rebuilds
 * the whole tree from mono, so a commit made on the remote since the last
 * mirror commit (found by its trailer, or its subject before the trailer existed; or since `adopt`, for a repository with history of its own)
 * would be reverted without a word. Run in a checkout of the branch.
 */
export async function guard(
	ps: Ps,
	mirror: string,
	project: string,
	adopt: string | undefined,
): Promise<void> {
	const git = async (...args: string[]) => {
		const result = await ps.spawnCapture(["git", ...args], { cwd: mirror });
		if (result.exitCode !== 0) {
			throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
		}
		return result.stdout.trim();
	};
	const head = await ps.spawnCapture(["git", "rev-parse", "HEAD"], {
		cwd: mirror,
	});
	if (head.exitCode !== 0) {
		return; // a branch the remote does not have yet holds nothing to lose
	}
	const last = await git(
		"log",
		"--first-parent",
		"--max-count=1",
		"--format=%H",
		"--extended-regexp",
		`--grep=^${TRAILER}: [0-9a-f]{40}$`,
		// commits made before the trailer
		`--grep=^Mirror ${escapeRegExp(project)} at `,
	);
	const from = last !== "" ? last : adopt;
	if (from === undefined) {
		throw new Error(
			`${project}'s remote has commits but none is a mirror commit; name the commit the mirror takes over from with \`adopt\` to take it over on purpose`,
		);
	}
	const known = await ps.spawnCapture(
		["git", "cat-file", "-e", `${from}^{commit}`],
		{ cwd: mirror },
	);
	if (known.exitCode !== 0) {
		throw new Error(
			`${project} adopts ${from}, which the remote branch does not hold`,
		);
	}
	const foreign = await git("log", "--format=%h %an %s", `${from}..HEAD`);
	if (foreign !== "") {
		throw new Error(
			`${project}'s remote has commits the mirror did not make, which this run would revert:\n${foreign}\nImport them into mono, or drop them from the remote on purpose, then ship again`,
		);
	}
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
