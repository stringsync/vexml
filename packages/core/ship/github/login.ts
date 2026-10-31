import type { Ps } from "core/system";

/** Runs `gh auth login` unless somebody is already logged in. GH_TOKEN counts. */
export async function ghLogin(ps: Ps): Promise<void> {
	if ((await ps.spawnCapture(["gh", "auth", "status"])).exitCode === 0) {
		return;
	}
	// `gh auth login` reads from a human. CI is where there is none, and where
	// it would sit waiting rather than failing, so say what to set instead.
	if (ps.env("CI") !== undefined) {
		throw new Error("not logged in to GitHub: set GH_TOKEN");
	}
	const { exitCode } = await ps.spawn(["gh", "auth", "login"]);
	if (exitCode !== 0) {
		throw new Error("gh auth login failed");
	}
}
