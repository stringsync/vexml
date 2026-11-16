import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Ctx } from "../ctx";
import { type Step, step } from "../step";
import type { Bump } from "../target";
import { next } from "./version";
import { WORKFLOW_FILE, WORKFLOW_PATH, workflow } from "./workflow";

export interface ReleaseOptions {
	/** The package's name on npm, as `@stringsync/mdom`. */
	package: string;
	/** How far the release raises npm's latest version. */
	bump: Bump;
	/** The package's public mirror on GitHub, as `stringsync/mdom`. */
	repository: string;
	/** The command that tests the package, run from mono's root. */
	test: string;
	/**
	 * Globs, relative to the project folder, of paths the mirror leaves out
	 * (`skills/`, `AGENTS.md`) that it carries, as `skills/vexml/**`.
	 */
	keep?: readonly string[];
	/** Versions the mirror depends on in place of npm's latest, by package name. */
	pins?: Record<string, string>;
	/** Steps of the same target that finish before the first of these. */
	dependencies?: readonly string[];
}

// What the steps of one release share, kept while it is under way.
type State = { version: string; dir: string; sha?: string };

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
	const slug = opts.package.replace(/[^\w-]+/g, "-");
	const statePath = join(tmpdir(), `ship-npm-${slug}.json`);
	const checkout = join(tmpdir(), `ship-npm-${slug}-mirror`);
	const remote = `https://github.com/${opts.repository}.git`;

	const read = async (): Promise<State> =>
		JSON.parse(await readFile(statePath, "utf8"));
	const exists = async () => {
		try {
			await readFile(statePath);
			return true;
		} catch {
			return false;
		}
	};
	/** Where the package sits in the mirror, whose root is the project folder. */
	const inMirror = (dir: string) => dir.split("/").slice(1).join("/");
	const write = (state: State) => writeFile(statePath, JSON.stringify(state));
	/** Whether a command succeeds, with its output ignored. */
	const ok = async (ctx: Ctx, command: string) =>
		(await ctx.sh(`(${command}) >/dev/null 2>&1 && echo ok || true`)).includes(
			"ok",
		);
	/** A fresh clone of the mirror, or an updated one. */
	const sync = (ctx: Ctx) =>
		ctx.sh(
			`if [ -d ${quote(checkout)}/.git ]; then git -C ${quote(checkout)} fetch origin && git -C ${quote(checkout)} reset --hard origin/HEAD; else rm -rf ${quote(checkout)} && git clone ${quote(remote)} ${quote(checkout)}; fi`,
		);
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
	 */
	const tty = (command: string) =>
		`python3 -I -c ${quote("import os,pty,sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(['sh','-c',sys.argv[1]])))")} ${quote(command)}`;
	const publishedVersions = async (ctx: Ctx) =>
		(
			await ctx.sh(
				`npm view --prefer-online ${quote(opts.package)} version 2>/dev/null || true`,
			)
		).trim();

	return [
		step({
			id: "test",
			does: `Test ${opts.package}`,
			dependencies: opts.dependencies,
			run: (ctx) => ctx.sh(opts.test),
		}),
		step({
			id: "version",
			does: `Pick the next ${opts.bump} of ${opts.package} after what npm has`,
			dependencies: ["test"],
			done: exists,
			run: async (ctx) => {
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
				return text.trim() === workflow(dir).trim();
			},
			run: async (ctx) => {
				const dir = inMirror((await read()).dir);
				await sync(ctx);
				const path = join(checkout, WORKFLOW_PATH);
				await mkdir(join(checkout, ".github/workflows"), { recursive: true });
				await writeFile(path, workflow(dir));
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
				await ctx.sh(
					`bun core/packages/core/ship/npm/cli.ts mirror ${quote(state.dir)} ${quote(checkout)} ${quote(state.version)}${(opts.keep ?? []).map((glob) => ` ${quote(glob)}`).join("")}${opts.pins ? ` --pins ${quote(JSON.stringify(opts.pins))}` : ""}`,
				);
				const built = `cd ${quote(checkout)} && bun install && bun packages/core/ship/npm/cli.ts build ${quote(dir)}`;
				await ctx.sh(
					`${built} 2>&1 || (cd ${quote(checkout)} && bun install && bun core/packages/core/ship/npm/cli.ts build ${quote(dir)})`,
				);
				await ctx.sh(
					`cd ${quote(checkout)} && git add -A && (git diff --cached --quiet || git commit -m ${quote(`Release v${state.version}`)}) && git push origin HEAD`,
				);
				const sha = (await ctx.sh(`git -C ${quote(checkout)} rev-parse HEAD`))
					.trim()
					.split("\n")
					.pop() as string;
				await write({ ...state, sha });
				ctx.update(`Mirror at ${sha.slice(0, 7)}`);
			},
		}),
		step({
			id: "login",
			does: "Sign in to npm, unless this machine already is",
			dependencies: ["mirror"],
			done: (ctx) => ok(ctx, "npm whoami"),
			run: (ctx) => ctx.sh(tty("npm login --auth-type=web"), { prompts: true }),
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
			done: (ctx) =>
				ok(
					ctx,
					`npm trust list ${quote(opts.package)} | grep -q ${quote(WORKFLOW_FILE)}`,
				),
			run: (ctx) =>
				ctx.sh(
					tty(
						`npm trust github ${quote(opts.package)} --repo ${quote(opts.repository)} --file ${quote(WORKFLOW_FILE)} --allow-publish --yes`,
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
				const published = await ok(
					ctx,
					`npm view --prefer-online ${quote(`${opts.package}@${version}`)} version | grep -q .`,
				);
				if (published) {
					ctx.released(version);
				}
				return published;
			},
			run: async (ctx) => {
				const { sha, version } = await read();
				try {
					await ctx.sh(
						`gh workflow run ${quote(WORKFLOW_FILE)} -R ${quote(opts.repository)} -f ref=${quote(sha as string)}`,
					);
					await ctx.sh(
						`sleep 5 && id=$(gh run list -R ${quote(opts.repository)} --workflow ${quote(WORKFLOW_FILE)} --limit 1 --json databaseId --jq '.[0].databaseId') && gh run watch "$id" -R ${quote(opts.repository)} --exit-status`,
					);
				} catch (error) {
					// An earlier run may have published this version already
					// (npm's view can lag), which makes this one fail with
					// "cannot publish over"; the version being out is the goal.
					const out = await ok(
						ctx,
						`npm view --prefer-online ${quote(`${opts.package}@${version}`)} version | grep -q .`,
					);
					if (!out) {
						throw error;
					}
				}
				ctx.update(`Published ${opts.package}@${version}`);
				ctx.released(version);
			},
		}),
		step({
			id: "tag",
			does: `Tag a GitHub release of ${opts.package} on ${opts.repository}`,
			dependencies: ["publish"],
			done: async (ctx) => {
				if (!(await exists())) {
					return true;
				}
				const { version } = await read();
				return ok(
					ctx,
					`gh release view v${version} -R ${quote(opts.repository)}`,
				);
			},
			run: async (ctx) => {
				const { sha, version } = await read();
				await ctx.sh(
					`gh release create v${version} -R ${quote(opts.repository)} --target ${quote(sha as string)} --title v${version} --generate-notes`,
				);
				await rm(statePath, { force: true });
				ctx.update(`Released ${opts.package}@${version}`);
			},
		}),
	];
}

function quote(word: string): string {
	return /^[\w@%+=:,./-]+$/.test(word)
		? word
		: `'${word.replaceAll("'", `'\\''`)}'`;
}
