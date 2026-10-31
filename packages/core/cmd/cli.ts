import { ConsoleLogger, color } from "core/log";
import { NodePs } from "core/system";
import { Command } from "./command";
import type { Deps } from "./deps";
import { type Row, table } from "./help";
import type { AnyMiddleware, Middleware } from "./middleware";

/**
 * What a `Cli` dispatches to: a command, or a group that dispatches again.
 * `Command` satisfies it as it is, which is what lets the two nest freely.
 */
interface Node<D> {
	/** What it does, beside the name it registered under in the parent's help. */
	summary(): string;
	exec(argv: string[], deps: D, outer: AnyMiddleware[], path: string): unknown;
}

/**
 * `D` is what `run` is handed and what the actions start from; `C` is what the
 * middleware has made of it by the time an action runs. Declaring a cli
 * therefore takes no dependencies at all, which is what makes the declaration
 * itself testable: build it once at module scope, run it with fakes.
 */
export class Cli<D extends Deps = Deps, C extends object = D>
	implements Node<D>
{
	private cmds = new Map<string, Node<D>>();
	private middleware: AnyMiddleware[] = [];
	private _description = "";
	private _fallback: string | undefined;

	constructor(readonly name: string) {}

	/** Only shown when this is a group, on its line in the parent's help. */
	description(description: string): this {
		this._description = description;
		return this;
	}

	/** Wraps every command's action. Call it before any `command()`. */
	use<Out extends object>(middleware: Middleware<C, Out>): Cli<D, Out> {
		// `command()` fixes the context type at the point it is called, so a
		// later `use` would change what actions receive without their types
		if (this.cmds.size > 0) {
			throw new Error(`${this.name}: use() must come before command()`);
		}
		this.middleware.push(middleware as unknown as AnyMiddleware);
		return this as unknown as Cli<D, Out>;
	}

	// unknown is the empty-options seed: `unknown & { name: string }` reduces to
	// `{ name: string }`, so options accumulate cleanly as they're declared.
	command(name: string): Command<unknown, C> {
		const command = new Command<unknown, C>(name);
		// registered by reference; chain mutates the same object
		this.cmds.set(name, command as unknown as Node<D>);
		return command;
	}

	/**
	 * A subcommand that is itself a set of subcommands: `skills add`, `skills
	 * update`. The group is a `Cli` too, so it groups, takes middleware and
	 * prints help exactly the way the root does; only its name is longer.
	 */
	group(name: string): Cli<D, C> {
		const group = new Cli<D, C>(name);
		this.cmds.set(name, group as Node<D>);
		return group;
	}

	/**
	 * The subcommand that runs when the first argument names none of the
	 * others, or there is none: `scry` runs `scry check`, and so do
	 * `scry ./app` and `scry --since main`, while `scry add` still adds. It
	 * gets the whole argument list. `--help` still prints this cli's help.
	 */
	fallback(name: string): this {
		this._fallback = name;
		return this;
	}

	/**
	 * Mounts another cli's commands under `name`. The mounted cli is built
	 * standalone, as its own program; here it becomes a group, and help names
	 * every command by the path it was reached through, not the name the
	 * mounted cli was built with.
	 */
	mount<Sub extends object>(name: string, sub: Cli<D, Sub>): this {
		this.cmds.set(name, sub as Node<D>);
		return this;
	}

	/**
	 * The program's own dependencies; `log` and `ps` are filled in with the real
	 * ones when left out, and `argv` with the process's own arguments, so a bin
	 * only names what is its own. A test that wants fakes passes them.
	 */
	run(deps: Omit<D, keyof Deps> & Partial<Deps>, argv?: string[]): unknown {
		const ps = deps.ps ?? new NodePs();
		const full = { ...deps, log: deps.log ?? new ConsoleLogger(), ps } as D;
		try {
			const out = this.exec(argv ?? ps.args, full, []);
			// async actions reject after exec() returns, so cover that path too
			return out instanceof Promise
				? out.catch((error) => this.fail(full, error))
				: out;
		} catch (error) {
			return this.fail(full, error);
		}
	}

	/**
	 * Dispatch, with whatever middleware the levels above contribute. Errors are
	 * left to propagate: only the root's `run` ends the process, so a group
	 * nested three deep still fails once, at the top. `path` is the spelling
	 * that reached this cli, which only the caller knows: a mounted cli is
	 * named one way on its own and another under the program that mounts it.
	 */
	exec(
		argv: string[],
		deps: D,
		outer: AnyMiddleware[] = [],
		path = this.name,
	): unknown {
		const [name, ...rest] = argv;
		if (name === "--help" || name === "-h") {
			return this.help(deps, path);
		}
		const cmd = name === undefined ? undefined : this.cmds.get(name);
		if (!cmd) {
			const fallback =
				this._fallback === undefined
					? undefined
					: this.cmds.get(this._fallback);
			return fallback
				? fallback.exec(argv, deps, [...outer, ...this.middleware], path)
				: this.help(deps, path);
		}
		return cmd.exec(
			rest,
			deps,
			[...outer, ...this.middleware],
			`${path} ${name}`,
		);
	}

	summary(): string {
		return this._description;
	}

	// message only, no stack: a bad flag is a user error, not a crash
	private fail(deps: D, error: unknown): void {
		deps.log.error(`error: ${error instanceof Error ? error.message : error}`);
		deps.ps.exit(1);
	}

	private help(deps: D, path: string): void {
		const rows = [...this.cmds].map(([name, command]): Row => {
			const fallback = name === this._fallback ? color.dim("(default)") : "";
			return [name, [command.summary(), fallback].filter(Boolean).join(" ")];
		});
		const lines = [
			`${color.bold("Usage:")} ${color.bold(path)} ${color.dim("<command> [options]")}`,
			"",
			color.bold("Commands:"),
			...table(rows, (name) => color.bold(color.blue(name)), deps.ps.columns()),
			"",
			color.dim(`Run \`${path} <command> --help\` for a command's options.`),
		];
		deps.log.info(lines.join("\n"));
	}
}

export function cli<D extends Deps = Deps>(name: string): Cli<D> {
	return new Cli<D>(name);
}
