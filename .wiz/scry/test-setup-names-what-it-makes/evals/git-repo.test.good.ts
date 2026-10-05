/** A throwaway git repo with one commit on `main`. */
export async function repo() {
	const root = await mkdtemp(join(tmpdir(), "arbor-"));
	await git(root, "init", "-b", "main");
	return { root, git };
}
