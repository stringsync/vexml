import { Readable } from "node:stream";
import { cli, type Deps } from "core/cmd";
import { NodePs } from "core/system";
import { z } from "zod";
import type { Quiet } from "./answering-sh";
import type { Ctx } from "./ctx";
import { type RunLine, StepCtxs, type Terminal } from "./process-ctx";
import { type AnswerInput, noPrompts, PromptChannel } from "./prompts";
import { StdTerminal } from "./std-terminal";
import type { Step } from "./step";
import { type Bump, steps, type Target, type Upstream, view } from "./target";
import { shipInTerminal } from "./terminal";

/** What `serve` runs with: the process, where lines go, who answers prompts. */
export type ServeDeps = Deps & {
	/** The person at the terminal runner. The process's own when left out. */
	terminal: Terminal;
	/**
	 * Where `run` reads the answers to its prompts, as JSON lines. The
	 * process's stdin when left out; opened only once a step asks.
	 */
	input: AnswerInput;
	/** How long a prompting command stays quiet before it is read as asking. */
	quiet: Partial<Quiet>;
};

/** What a `done` or `run` request names. */
interface StepRequest {
	step: string;
	bump?: Bump;
	version?: string;
	target?: string;
	upstream: string[];
}

const bump = z.enum(["patch", "minor", "major"]).optional();

/**
 * Answers a ship request for one target or several, from the project's CLI
 * (`bin/mdom ship`), with `argv` the words after it:
 *
 * - `plan` prints the checked plan as JSON: one object, or an array when the
 *   command serves several targets and `--target` names none.
 * - `unshipped` prints each target's unshipped commit count as JSON, an
 *   object keyed by target name, leaving out targets that cannot tell.
 * - `current` prints each target's current version as JSON, an object keyed
 *   by target name, leaving out targets that cannot tell.
 * - `versions` prints the versions each target may ship, newest first, as
 *   JSON keyed by target name, leaving out targets that cannot tell.
 * - `done <step>` prints `true` or `false`: whether the step already happened.
 * - `run <step>` runs one step, writing JSON lines as it goes, and on failure
 *   an error line last and exit 1.
 * - With none of them, it runs the whole target for someone at a terminal.
 *
 * Each takes `--version` or `--bump`, `--target <name>` (needed by all but `plan` when there
 * are several targets) and `--upstream <name>=<version>`, once per target
 * the target depends on.
 */
export async function serve(
	targets: Target | readonly Target[],
	argv: string[],
	deps: Partial<ServeDeps> = {},
): Promise<void> {
	const list: readonly Target[] = Array.isArray(targets)
		? targets
		: [targets as Target];
	const names = new Set<string>();
	for (const each of list) {
		if (names.has(each.name)) {
			throw new Error(`Two targets are named "${each.name}"`);
		}
		names.add(each.name);
	}
	const ps = deps.ps ?? new NodePs();
	const ctxs = new StepCtxs(ps, deps.quiet);
	const ship = cli<Deps>("ship").fallback("all");

	ship
		.command("plan")
		.description("print the plan as JSON")
		.option("bump", bump)
		.option("version", z.string().optional())
		.option("target", z.string().optional())
		.repeated("upstream", z.string())
		.action(async (opts, { log }) => {
			const upstream = parseUpstream(opts.upstream, (name) => ({
				version: `the version ${name} releases`,
			}));
			const input = { bump: opts.bump, version: opts.version, upstream };
			const _ctx = ctxs.stream(
				{ send: (line) => log.error(JSON.stringify(line)) },
				noPrompts,
			);
			const out =
				opts.target || list.length === 1
					? view(pick(list, opts.target), input)
					: list.map((each) => view(each, input));
			log.info(JSON.stringify(out));
		});

	/**
	 * A command that prints what `read` gives for each chosen target as JSON,
	 * keyed by target name, leaving out targets it gives nothing for and
	 * reporting one that throws on stderr.
	 */
	const perTarget = <T>(
		command: string,
		description: string,
		read: (
			target: Target,
		) => ((ctx: Pick<Ctx, "sh">) => Promise<T>) | undefined,
	) =>
		ship
			.command(command)
			.description(description)
			.option("target", z.string().optional())
			.action(async (opts, { log }) => {
				const ctx = ctxs.stream(
					{ send: (line) => log.error(JSON.stringify(line)) },
					noPrompts,
				);
				const chosen = opts.target ? [pick(list, opts.target)] : list;
				const found = await Promise.all(
					chosen.map(async (each): Promise<[string, T] | undefined> => {
						const reader = read(each);
						if (!reader) {
							return undefined;
						}
						try {
							return [each.name, await reader(ctx)];
						} catch (error) {
							log.error(
								JSON.stringify({
									type: "error",
									target: each.name,
									message:
										error instanceof Error ? error.message : String(error),
								}),
							);
							return undefined;
						}
					}),
				);
				log.info(
					JSON.stringify(
						Object.fromEntries(found.filter((each) => each !== undefined)),
					),
				);
			});

	perTarget(
		"unshipped",
		"print each target's unshipped commit count as JSON",
		(each) => each.unshipped,
	);
	perTarget(
		"current",
		"print each target's current version as JSON",
		(each) => each.current,
	);
	perTarget(
		"versions",
		"print the versions each target may ship as JSON",
		(each) => each.versions,
	);

	ship
		.command("done")
		.description("print whether a step already happened")
		.arg("step", z.string())
		.option("bump", bump)
		.option("version", z.string().optional())
		.option("target", z.string().optional())
		.repeated("upstream", z.string())
		.action(async (opts, { log }) => {
			const found = find(list, { ...opts, lenient: true });
			const ctx = ctxs.stream(
				{ send: (line) => log.error(JSON.stringify(line)) },
				noPrompts,
			);
			log.info(JSON.stringify(found.done ? await found.done(ctx) : false));
		});

	ship
		.command("run")
		.description("run one step, writing JSON lines")
		.arg("step", z.string())
		.option("bump", bump)
		.option("version", z.string().optional())
		.option("target", z.string().optional())
		.repeated("upstream", z.string())
		.action(async (opts, { log }) => {
			const stream = {
				send: (line: RunLine) => log.info(JSON.stringify(line)),
			};
			const prompts = new PromptChannel(stream, deps.input ?? stdin);
			try {
				await find(list, { ...opts, lenient: "planning" }).run(
					ctxs.stream(stream, prompts),
				);
			} catch (error) {
				stream.send({
					type: "error",
					message: error instanceof Error ? error.message : String(error),
				});
				ps.exit(1);
			} finally {
				prompts.dispose();
			}
		});

	ship
		.command("all")
		.description("ship the whole target here, asking first")
		.option("bump", bump)
		.option("version", z.string().optional())
		.option("target", z.string().optional())
		.repeated("upstream", z.string())
		.action(async (opts, { log }) => {
			await shipInTerminal(
				{
					target: pick(list, opts.target),
					bump: opts.bump,
					version: opts.version,
					upstream: parseUpstream(opts.upstream),
				},
				deps.terminal ?? new StdTerminal(log),
				ctxs,
			);
		});

	await ship.run({ ...deps, ps }, argv);
}

/** The target `--target` names, or the only one. */
function pick(list: readonly Target[], name: string | undefined): Target {
	if (name === undefined) {
		if (list.length === 1 && list[0]) {
			return list[0];
		}
		throw new Error(
			`Name the target with --target: ${list.map((each) => each.name).join(", ")}`,
		);
	}
	const found = list.find((each) => each.name === name);
	if (!found) {
		throw new Error(
			`No target is named "${name}": ${list.map((each) => each.name).join(", ")}`,
		);
	}
	return found;
}

/** The step a `done` or `run` request names, from the plan it would see. */
function find(
	list: readonly Target[],
	opts: StepRequest & { lenient?: boolean | "planning" },
): Step {
	const chosen = pick(list, opts.target);
	const upstreams = readUpstream(opts.upstream);
	const follows = chosen.version?.follows;
	const hasFollowed = follows !== undefined && upstreams.has(follows);
	if (
		chosen.version &&
		opts.version === undefined &&
		!(opts.bump ?? chosen.bump) &&
		!hasFollowed
	) {
		throw new Error(
			follows !== undefined
				? `The target "${chosen.name}" needs --version, --bump, or --upstream ${follows}=<version>`
				: `The target "${chosen.name}" needs --version or --bump`,
		);
	}
	// A `done` or `run` request may come before any upstream has released (a
	// step like `test` reads none), so it plans with a placeholder version, as
	// `plan` does, rather than refusing. A step that pins one fails loudly on it.
	// With "planning" the placeholder is only for building the plan: a step
	// that reads an upstream as it runs still refuses without the version.
	let planning = true;
	const strict = upstreamLookup(upstreams);
	const lenient = upstreamLookup(upstreams, (each) => ({
		version: `the version ${each} releases`,
	}));
	const planned = steps(chosen, {
		bump: opts.bump,
		version: opts.version,
		upstream: (name) =>
			opts.lenient && (opts.lenient !== "planning" || planning)
				? lenient(name)
				: strict(name),
	});
	planning = false;
	const found = planned.find((each) => each.id === opts.step);
	if (!found) {
		throw new Error(
			`The target "${chosen.name}" has no step "${opts.step}": ${planned.map((each) => each.id).join(", ")}`,
		);
	}
	return found;
}

/**
 * Reads `--upstream <name>=<version>` values into the `upstream` a plan
 * takes. A name with no value answers `missing`, or throws without one.
 */
function parseUpstream(
	values: readonly string[],
	missing?: (name: string) => Upstream,
): (name: string) => Upstream {
	return upstreamLookup(readUpstream(values), missing);
}

function readUpstream(values: readonly string[]): Map<string, string> {
	const versions = new Map<string, string>();
	for (const value of values) {
		const at = value.indexOf("=");
		if (at <= 0 || at === value.length - 1) {
			throw new Error(`--upstream takes <name>=<version>, not "${value}"`);
		}
		versions.set(value.slice(0, at), value.slice(at + 1));
	}
	return versions;
}

function upstreamLookup(
	versions: ReadonlyMap<string, string>,
	missing?: (name: string) => Upstream,
): (name: string) => Upstream {
	return (name) => {
		const version = versions.get(name);
		if (version !== undefined) {
			return { version };
		}
		if (missing) {
			return missing(name);
		}
		throw new Error(
			`The plan reads what ${name} released: pass --upstream ${name}=<version>`,
		);
	};
}

/** The process's stdin, as a stream. */
const stdin: AnswerInput = {
	open: () =>
		Readable.toWeb(process.stdin) as unknown as ReadableStream<Uint8Array>,
};
