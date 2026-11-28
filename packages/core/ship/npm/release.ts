import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Ctx } from "../ctx";
import { type Step, step } from "../step";
import type { Bump } from "../target";
import { releaseTag } from "../unshipped";
import { isSemver, next } from "./version";
import { WORKFLOW_FILE, WORKFLOW_PATH, workflow } from "./workflow";
import type { Fold } from "./workspace";

/**
 * The steps of releasing `package` to npm through its public mirror, to spread
 * into a target's plan. A resumed ship publishes nothing twice: each step has
 * a done check, and the chosen version is kept until the release is tagged.
 *
 * @example
 * plan: ({ bump }) => npm.release({ package: "@stringsync/mdom", bump,
 *   repository: "stringsync/mdom", test: "bin/mdom test" })
 */
export function release(opts: ReleaseOptions): Step[] {
	if (opts.bump !== undefined && opts.version !== undefined) {
		throw new Error("Pass either bump or version to npm.release, not both");
	}
	if (opts.bump === undefined && opts.version === undefined) {
		throw new Error("Pass either bump or version to npm.release");
	}
	const slug = opts.package.replace(/[^\w-]+/g, "-");
	const cacheDir = opts.cacheDir ?? defaultCacheDir();
	const statePath = join(cacheDir, `${slug}.json`);
	const checkout = join(cacheDir, `${slug}-mirror`);
	const remote = `https://github.com/${opts.repository}.git`;

	const read = async (): Promise<State> =>
		JSON.parse(await readFile(statePath, "utf8"));
	const readIfExists = async (): Promise<State | undefined> => {
		try {
			return await read();
		} catch {
			return undefined;
		}
	};
	const exists = async () => (await readIfExists()) !== undefined;
	/** Where the package sits in the mirror, whose root is the project folder. */
	const inMirror = (dir: string) =>
		opts.scope === "package" ? "." : dir.split("/").slice(1).join("/");
	const write = async (state: State) => {
		await mkdir(cacheDir, { recursive: true });
		await writeFile(statePath, JSON.stringify(state));
	};
	/** Whether a command succeeds, with its output ignored. */
	const ok = async (ctx: Ctx, command: string) =>
		(await ctx.sh(`(${command}) >/dev/null 2>&1 && echo ok || true`)).includes(
			"ok",
		);
	/**
	 * A fresh clone of the mirror, or an updated one. Falls back to a fresh
	 * clone when a cached checkout is missing, broken, or detached.
	 */
	const sync = (ctx: Ctx) =>
		ctx.sh(
			`([ -d ${quote(checkout)}/.git ] && git -C ${quote(checkout)} symbolic-ref -q HEAD >/dev/null && git -C ${quote(checkout)} fetch origin && git -C ${quote(checkout)} reset --hard origin/HEAD) || (rm -rf ${quote(checkout)} && mkdir -p ${quote(cacheDir)} && git clone ${quote(remote)} ${quote(checkout)})`,
		);
	/** The mono tag for `version`, as a full ref. */
	const monoRef = (version: string) =>
		quote(`refs/tags/${releaseTag(opts.package, version)}`);
	const locate = async (ctx: Ctx) =>
		JSON.parse(
			(
				await ctx.sh(
					`bun core/packages/core/ship/npm/cli.ts locate ${quote(opts.package)}`,
				)
			)
				.trim()
				.split("\n")
				.pop() as string,
		) as { dir: string; version?: string };
	/**
	 * `command` under a pseudo-terminal, so npm sees a terminal and starts its
	 * web sign-in and one-time-password flow instead of failing over pipes.
	 * Python's `pty` makes one without needing a terminal on stdin, which
	 * `script` does (it fails when stdin is a socket), and keeps the exit code.
	 * `npm_config_browser=false` keeps npm from asking to press ENTER to open a
	 * browser on this machine, where nobody is: it prints the link instead.
	 *
	 * On macOS a pseudo-terminal reads as end of file once the command exits,
	 * where Linux raises EIO. Python 3.9's `pty.spawn` (macOS's own
	 * `/usr/bin/python3`) waits forever on that end of file once stdin has
	 * ended too, so the read raises at end of file, which every version takes
	 * as the command being done.
	 */
	const tty = (command: string) =>
		`python3 -I -c ${quote(PTY)} ${quote(`export npm_config_browser=false; ${command}`)}`;
	/**
	 * What `npm view <spec> <field>` says: its output, or `undefined` when npm
	 * answers E404, the package never published. Any other failure is retried
	 * a few times and then thrown, so a network hiccup never reads as
	 * "unpublished" and sends a release down the path that needs a person.
	 */
	const view = async (
		ctx: Ctx,
		spec: string,
		field: string,
	): Promise<string | undefined> => {
		const command =
			`err=$(mktemp); out=$(npm view --prefer-online ${quote(spec)} ${quote(field)} 2>"$err"); code=$?; ` +
			`if [ "$code" = 0 ]; then echo found; printf '%s' "$out"; ` +
			`elif grep -q E404 "$err"; then echo missing; ` +
			`else echo error; cat "$err"; fi; rm -f "$err"`;
		let failure = "";
		for (let attempt = 0; attempt < QUERY_ATTEMPTS; attempt++) {
			if (attempt > 0) {
				await new Promise((resolve) =>
					setTimeout(resolve, (opts.retryDelay ?? 2000) * 2 ** (attempt - 1)),
				);
			}
			const out = await ctx.sh(command).catch((error: unknown) => {
				failure = String(error);
				return "error";
			});
			const [head, ...rest] = out.split("\n");
			if (head === "found") {
				return rest.join("\n").trim();
			}
			if (head === "missing") {
				return undefined;
			}
			failure = rest.join("\n").trim() || failure;
		}
		throw new Error(
			`npm view ${spec} ${field} failed ${QUERY_ATTEMPTS} times, so whether it is published is unknown: ${failure}`,
		);
	};
	/** npm's latest version, or "" for a package npm never had. */
	const publishedVersions = async (ctx: Ctx) =>
		(await view(ctx, opts.package, "version")) ?? "";

	/**
	 * Waits until npm serves `pkg@version`, since npm says a newly published
	 * version "may take a few minutes to become available".
	 */
	const waitForVersion = async (
		ctx: Ctx,
		pkg: string,
		version: string,
	): Promise<boolean> => {
		const spec = `${pkg}@${version}`;
		const attempts = opts.waitAttempts ?? PUBLISH_WAIT_ATTEMPTS;
		const delay = opts.waitDelay ?? PUBLISH_WAIT_DELAY;
		for (let attempt = 0; attempt < attempts; attempt++) {
			if (attempt > 0 && delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			if (
				await ok(
					ctx,
					`npm view --prefer-online ${quote(spec)} version | grep -q .`,
				)
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Whether npm's latest version was published by the GitHub workflow, which
	 * only happens once npm trusts it: `npm trust list` needs a one-time
	 * password even to read, so this is how a release avoids asking for a login
	 * it will not use.
	 */
	const publishedByWorkflow = async (ctx: Ctx) =>
		((await view(ctx, opts.package, "_npmUser")) ?? "").includes(
			"npm-oidc-no-reply",
		);

	// First, so the one step that needs the user comes while they are still
	// at the screen, not after the tests and the mirror have run.
	return [
		step({
			id: "login",
			does: "Sign in to npm, unless this machine already is",
			dependencies: opts.dependencies,
			done: async (ctx) =>
				(await publishedByWorkflow(ctx)) || ok(ctx, "npm whoami"),
			run: (ctx) => ctx.sh(tty("npm login --auth-type=web"), { prompts: true }),
		}),
		step({
			id: "test",
			does: `Test ${opts.package}`,
			dependencies: ["login"],
			run: (ctx) => ctx.sh(opts.test),
		}),
		step({
			id: "version",
			does:
				opts.version !== undefined
					? `Use ${opts.version} for ${opts.package}`
					: `Pick the next ${opts.bump} of ${opts.package} after what npm has`,
			dependencies: ["test"],
			done: async () => {
				const cached = await readIfExists();
				if (opts.version !== undefined) {
					return cached?.version === opts.version;
				}
				return cached !== undefined;
			},
			run: async (ctx) => {
				if (opts.version !== undefined) {
					const placeholder = UNRESOLVED_UPSTREAM.exec(opts.version);
					if (placeholder) {
						throw new Error(
							`Cannot release ${opts.package}: "${opts.version}" is an unresolved upstream version placeholder; pass --upstream ${placeholder[1]}=<version>`,
						);
					}
					if (!isSemver(opts.version)) {
						throw new Error(
							`"${opts.version}" is not a clean semantic version for ${opts.package}`,
						);
					}
					const cached = await readIfExists();
					if (cached?.version === opts.version) {
						ctx.update(`Releasing ${opts.package}@${opts.version}`);
						return;
					}
					if (await view(ctx, `${opts.package}@${opts.version}`, "version")) {
						throw new Error(
							`${opts.package}@${opts.version} is already published on npm`,
						);
					}
					const { dir } = await locate(ctx);
					await write({ version: opts.version, dir });
					ctx.update(`Releasing ${opts.package}@${opts.version}`);
					return;
				}
				const { dir, version: declared } = await locate(ctx);
				const latest = await publishedVersions(ctx);
				const version = latest
					? next(latest, opts.bump)
					: (declared ?? "0.1.0");
				await write({ version, dir });
				ctx.update(`Releasing ${opts.package}@${version}`);
			},
		}),
		step({
			id: "workflow",
			does: `Put the publish workflow on ${opts.repository}`,
			dependencies: ["version"],
			done: async (ctx) => {
				const dir = inMirror((await read()).dir);
				const text = await ctx.sh(
					`gh api -H 'Accept: application/vnd.github.raw' repos/${opts.repository}/contents/${WORKFLOW_PATH} 2>/dev/null || true`,
				);
				return text.trim() === workflow(dir, opts.prepare).trim();
			},
			run: async (ctx) => {
				const dir = inMirror((await read()).dir);
				await sync(ctx);
				const path = join(checkout, WORKFLOW_PATH);
				await mkdir(join(checkout, ".github/workflows"), { recursive: true });
				await writeFile(path, workflow(dir, opts.prepare));
				await ctx.sh(
					`cd ${quote(checkout)} && git add ${quote(WORKFLOW_PATH)} && git commit -m 'Add the publish workflow' && git push origin HEAD`,
				);
			},
		}),
		step({
			id: "mirror",
			does: `Write the mirror of ${opts.package} and build it there`,
			dependencies: ["workflow"],
			done: async (_ctx) => {
				const state = await read();
				return Boolean(state.sha);
			},
			run: async (ctx) => {
				const state = await read();
				const dir = inMirror(state.dir);
				await sync(ctx);
				const pins = opts.pins
					? Object.fromEntries(
							Object.entries(opts.pins).filter(
								([, version]) => !UNRESOLVED_UPSTREAM.test(version),
							),
						)
					: undefined;
				const hasPins = pins !== undefined && Object.keys(pins).length > 0;
				await ctx.sh(
					`bun core/packages/core/ship/npm/cli.ts mirror ${quote(state.dir)} ${quote(checkout)} ${quote(state.version)}${(opts.keep ?? []).map((glob) => ` ${quote(glob)}`).join("")}${opts.omit ? ` --omit ${quote(JSON.stringify(opts.omit))}` : ""}${hasPins ? ` --pins ${quote(JSON.stringify(pins))}` : ""}${opts.fold ? ` --fold ${quote(JSON.stringify(opts.fold))}` : ""}${opts.scope === "package" ? " --package-only" : ""}`,
				);
				for (const [name, version] of Object.entries(pins ?? {})) {
					if (!(await waitForVersion(ctx, name, version))) {
						throw new Error(
							`Pinned dependency ${name}@${version} did not appear on npm`,
						);
					}
				}
				const env = `export SHIP_VERSION=${quote(state.version)}`;
				const hook = (command: string) =>
					ctx.sh(`cd ${quote(checkout)} && ${env} && ${command}`);
				await ctx.sh(`cd ${quote(checkout)} && bun install --no-cache`);
				if (opts.prepare) {
					await hook(opts.prepare);
				}
				const built = `cd ${quote(checkout)} && bun install && bun packages/core/ship/npm/cli.ts build ${quote(dir)}`;
				await ctx.sh(
					`${built} 2>&1 || (cd ${quote(checkout)} && bun install && bun core/packages/core/ship/npm/cli.ts build ${quote(dir)})`,
				);
				if (opts.check) {
					await hook(opts.check);
				}
				if (opts.mirrorTest) {
					await hook(opts.mirrorTest);
				}
				const monoSha = (await ctx.sh("git rev-parse HEAD"))
					.trim()
					.split("\n")
					.pop();
				await ctx.sh(
					`cd ${quote(checkout)} && git add -A && (git diff --cached --quiet || git commit -m ${quote(`Release v${state.version}`)} -m ${quote(`Mirrored-from: ${monoSha}`)}) && git push origin HEAD`,
				);
				const sha = (await ctx.sh(`git -C ${quote(checkout)} rev-parse HEAD`))
					.trim()
					.split("\n")
					.pop() as string;
				await write({ ...state, sha, monoSha });
				ctx.update(`Mirror at ${sha.slice(0, 7)}`);
			},
		}),
		step({
			id: "first-publish",
			does: `Publish ${opts.package} from this machine, since npm has never had it`,
			dependencies: ["mirror", "login"],
			done: async (ctx) => Boolean(await publishedVersions(ctx)),
			run: async (ctx) => {
				const { dir: monoDir, version } = await read();
				const dir = inMirror(monoDir);
				await ctx.sh(
					tty(
						`cd ${quote(checkout)}/${quote(dir)}/dist && npm publish --access public`,
					),
					{ prompts: true },
				);
				ctx.update(`Published ${opts.package}@${version}`);
			},
		}),
		step({
			id: "trust",
			does: `Have npm trust ${WORKFLOW_FILE} of ${opts.repository} to publish ${opts.package}`,
			dependencies: ["first-publish", "login"],
			done: async (ctx) =>
				(await publishedByWorkflow(ctx)) ||
				ok(
					ctx,
					`npm trust list ${quote(opts.package)} | grep -q ${quote(WORKFLOW_FILE)}`,
				),
			run: (ctx) =>
				ctx.sh(
					tty(
						// npm trust is not idempotent: a second `npm trust github` is
						// refused with E409 once any config exists, and a 409 names the
						// config that is the goal, so it counts as trusted. npm asks for
						// its one-time password only when its stdout is a terminal, so
						// stdout stays on the pseudo-terminal and only stderr, where the
						// E409 is written, goes through `tee` (by a fifo, as sh has no
						// process substitution) to be read after.
						`dir=$(mktemp -d); mkfifo "$dir/err"; tee "$dir/log" < "$dir/err" >&2 & ` +
							`npm trust github ${quote(opts.package)} --repo ${quote(opts.repository)} --file ${quote(WORKFLOW_FILE)} --allow-publish --yes 2> "$dir/err"; ` +
							`code=$?; wait; ` +
							`if [ "$code" = 0 ] || grep -q E409 "$dir/log"; then code=0; fi; ` +
							`rm -rf "$dir"; exit "$code"`,
					),
					{ prompts: true },
				),
		}),
		step({
			id: "publish",
			does: `Publish ${opts.package} through the workflow`,
			dependencies: ["trust"],
			done: async (ctx) => {
				const { version } = await read();
				const published = Boolean(
					await view(ctx, `${opts.package}@${version}`, "version"),
				);
				if (published) {
					ctx.released(version);
				}
				return published;
			},
			run: async (ctx) => {
				const { sha, version } = await read();
				let workflowError: unknown;
				try {
					await ctx.sh(
						`gh workflow run ${quote(WORKFLOW_FILE)} -R ${quote(opts.repository)} -f ref=${quote(sha as string)}`,
					);
					await ctx.sh(
						`sleep 5 && id=$(gh run list -R ${quote(opts.repository)} --workflow ${quote(WORKFLOW_FILE)} --limit 1 --json databaseId --jq '.[0].databaseId') && gh run watch "$id" -R ${quote(opts.repository)} --exit-status`,
					);
				} catch (error) {
					workflowError = error;
				}
				// npm says a new version "may take a few minutes to become
				// available": wait for the registry to serve it before
				// advancing downstream targets (or, on a workflow failure like
				// "cannot publish over", before treating the run as failed).
				if (!(await waitForVersion(ctx, opts.package, version))) {
					if (workflowError !== undefined) {
						throw workflowError;
					}
					throw new Error(
						`${opts.package}@${version} did not appear on npm after publishing`,
					);
				}
				ctx.update(`Published ${opts.package}@${version}`);
				ctx.released(version);
			},
		}),
		step({
			id: "tag",
			does: `Tag a GitHub release of ${opts.package} on ${opts.repository}, and tag mono's commit it was built from`,
			dependencies: ["publish"],
			done: async (ctx) => {
				if (!(await exists())) {
					return true;
				}
				const { version, monoSha } = await read();
				return (
					(await ok(
						ctx,
						`gh release view v${version} -R ${quote(opts.repository)}`,
					)) &&
					(!monoSha ||
						(await ok(
							ctx,
							`git ls-remote --exit-code --tags origin ${monoRef(version)}`,
						)))
				);
			},
			run: async (ctx) => {
				const { sha, version, monoSha } = await read();
				if (
					!(await ok(
						ctx,
						`gh release view v${version} -R ${quote(opts.repository)}`,
					))
				) {
					await ctx.sh(
						`gh release create v${version} -R ${quote(opts.repository)} --target ${quote(sha as string)} --title v${version} --generate-notes`,
					);
				}
				// The mono tag marks what the release carries, so the target's
				// unshipped count starts from it; a state from before the mirror
				// step kept the mono commit has none to tag.
				if (monoSha) {
					const ref = monoRef(version);
					await ctx.sh(
						`(git rev-parse -q --verify ${ref} >/dev/null || git tag -a ${quote(releaseTag(opts.package, version))} ${quote(monoSha)} -m ${quote(`Release ${opts.package} ${version}`)}) && git push origin ${ref}`,
					);
				}
				await rm(statePath, { force: true });
				ctx.update(`Released ${opts.package}@${version}`);
			},
		}),
	];
}

// What the steps of one release share, kept while it is under way: the
// version, the package's folder, the mirror's release commit, and the mono
// commit the mirror was written from.
type State = { version: string; dir: string; sha?: string; monoSha?: string };

interface ReleaseBaseOptions {
	/** The package's name on npm, as `@stringsync/mdom`. */
	package: string;
	/** The package's public mirror on GitHub, as `stringsync/mdom`. */
	repository: string;
	/** The command that tests the package, run from mono's root. */
	test: string;
	/** Project-relative globs of otherwise omitted paths to carry, as `skills/vexml/**`. */
	keep?: readonly string[];
	/** Project-relative globs of tracked paths to omit; `keep` wins overlaps. */
	omit?: readonly string[];
	/** Versions the mirror depends on in place of npm's latest, by package name. */
	pins?: Record<string, string>;
	/**
	 * A command run from the mirror's root after it is written and installed
	 * and before it is built and committed, so what it changes is in the
	 * release commit. The release's version is in `SHIP_VERSION`. The publish
	 * workflow runs it too, before its build.
	 */
	prepare?: string;
	/**
	 * A command run from the mirror's root after the build, with
	 * `SHIP_VERSION` set; the mirror step fails when it does, before anything
	 * is committed.
	 */
	check?: string;
	mirrorTest?: string; // Tests the built mirror from its root, before the commit.
	/**
	 * Private packages of other projects to fold into the mirror and the
	 * build, by package name, with the files each reads from disk.
	 */
	fold?: Fold;
	/**
	 * What the mirror holds of the project: `project` (the default) its whole
	 * folder, `package` only the published package's folder, at the mirror's
	 * root, for a project that keeps the rest private. `keep` and `omit` globs
	 * and the `mirror/` folder are then relative to the package's folder.
	 */
	scope?: "project" | "package";
	/** Steps of the same target that finish before the first of these. */
	dependencies?: readonly string[];
	/** Milliseconds before the first retry of a failed registry query, doubling after (default 2000). */
	retryDelay?: number;
	/** Milliseconds between polls waiting for a newly published version to appear on npm (default 5000). */
	waitDelay?: number;
	/** Maximum polls waiting for a newly published version to appear on npm (default 60). */
	waitAttempts?: number;
	/** Where the mirror checkout and in-progress state live (default: `$XDG_CACHE_HOME/core-ship/npm` or `~/.cache/core-ship/npm`). */
	cacheDir?: string;
}

export type ReleaseOptions = ReleaseBaseOptions &
	(
		| {
				/** How far the release raises npm's latest version. */
				bump: Bump;
				version?: never;
		  }
		| {
				/** The exact semantic version to publish, in place of bumping npm's latest. */
				version: string;
				bump?: never;
		  }
	);

/** Placeholder version `serve` supplies when planning before an upstream releases. */
const UNRESOLVED_UPSTREAM = /^the version (.+) releases$/;

/** How many times a registry query that fails other than with E404 is tried. */
const QUERY_ATTEMPTS = 3;

/** Polls and interval (5 minutes total) waiting for a newly published version to appear on npm. */
const PUBLISH_WAIT_ATTEMPTS = 60;
const PUBLISH_WAIT_DELAY = 5000;

/** Persistent cache outside `tmpdir()` (so OS temp cleanup never reaps it) and outside mono. */
function defaultCacheDir(): string {
	const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
	return join(base, "core-ship", "npm");
}

function quote(word: string): string {
	return /^[\w@%+=:,./-]+$/.test(word)
		? word
		: `'${word.replaceAll("'", `'\\''`)}'`;
}

/** Runs `sys.argv[1]` under a pseudo-terminal and exits with its exit code. */
const PTY = `import os, pty, sys

def read(fd):
    data = os.read(fd, 1024)
    if not data:
        raise OSError("end of file")
    return data

sys.exit(os.waitstatus_to_exitcode(pty.spawn(["sh", "-c", sys.argv[1]], read)))
`;
