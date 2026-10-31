import type { Fs, Glob, Ps } from "core/system";
import type { Workspace } from "../workspace/workspace";

/** The caller's rules for what a mirror holds. */
export interface MirrorConfig {
	/**
	 * Globs matched against paths relative to the workspace root, such as
	 * `**\/.vet/**`, applied to everything copied: the project's own files and
	 * the vendored source. What never leaves the repository (`node_modules`,
	 * `dist`, `.git`) is left out whatever these say.
	 */
	exclude?: readonly string[];
	/**
	 * Globs matched against paths relative to the project folder, such as
	 * `skills/splates/**`, for what the mirror keeps though it would otherwise
	 * leave it out as an agent file (`AGENTS.md`, `skills/**` and the like), for
	 * a project whose skill is the product. `exclude` still applies to them.
	 */
	keep?: readonly string[];
	/**
	 * Files that stand in for others in the mirror, by path relative to the
	 * project folder: each key is the path the mirror holds the file at, each
	 * value the project file it is read from, which the mirror does not hold
	 * under its own name. For a `Dockerfile` that only fits the mirror's layout.
	 */
	replace?: Readonly<Record<string, string>>;
	/**
	 * Edits to a file's text in the mirror, by path relative to the project
	 * folder (the mirror's path for it): each rule is a `[pattern, with]` pair,
	 * applied in order to the whole text as `String.replace` does, so a pattern
	 * with the `g` flag rewrites every match and `with` can use `$1`. This lets
	 * one file, such as a `Dockerfile`, serve both layouts: strip a folder prefix,
	 * move a path, or drop a line by matching it whole and replacing it with `""`.
	 * A rule that matches nothing is refused, so a stale one cannot go unnoticed.
	 */
	rewrite?: Readonly<Record<string, readonly (readonly [RegExp, string])[]>>;
	/**
	 * Scripts for the mirror's root manifest, such as a `postinstall` that
	 * builds what the project's tests import, which the workspace root's own
	 * scripts do in the workspace and the mirror does not carry.
	 */
	scripts?: Readonly<Record<string, string>>;
}

/** What a `MirrorStep` copies, and where it pushes; the real system by default. */
export interface MirrorOptions {
	/**
	 * The folder mirrored, relative to the workspace root: a project's
	 * top-level folder, such as `mdom`, or one package's, such as
	 * `sound2score/packages/player`, which then stands at the mirror's root.
	 */
	project: string;
	/** The public repository the project is mirrored to, as `git clone` takes it. */
	remote: string;
	/** The branch pushed to; `main` by default. */
	branch?: string;
	/**
	 * The commit of the remote branch the first mirror takes over from, for a
	 * repository with history of its own. Without a mirror commit on the branch
	 * (`Mirror <project> at <tag>`), commits after it are refused; once there is
	 * one, it decides and this no longer matters.
	 */
	adopt?: string;
	/** Tags the mirror's commit with the release's tag and pushes it too. */
	tag?: boolean;
	/** What the mirror leaves out and how; nothing is excluded by default. */
	config?: MirrorConfig;
	/** The workspace package folded in as source; `core` by default. */
	source?: string;
	/** Where the mirror is checked out while it is built; a temporary directory by default. */
	scratch?: string;
	/** Where the workspace is found; the manifest workspace around the working directory by default. */
	workspace?: Workspace;
	fs?: Fs;
	ps?: Ps;
	glob?: Glob;
}
