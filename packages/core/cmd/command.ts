import type { StandardSchemaV1 } from "@standard-schema/spec";
import { color, type Logger } from "core/log";
import type { Deps } from "./deps";
import { type Row, table, wrap } from "./help";
import { type AnyMiddleware, compose, type Middleware } from "./middleware";

// `parsed` is the whole command line: the positionals `arg()` declares and the
// flags `option()` does, in one object. Not a settings bag the caller can drop,
// so it leads, and the context the middleware built follows it.
// scry-ignore objects-over-callbacks: a command has one action, written as a
// closure at the call site, so an interface would only wrap that closure
type Action<O, C> = (parsed: O, ctx: C) => unknown;

/**
 * A Standard Schema that accepts command-line strings. Use
 * `z.coerce.number()` for numeric arguments, for example.
 */
export type Arg<T> = StandardSchemaV1<unknown, T>;

/** What a caller can say about an option or a positional beyond its schema. */
export type Meta<T> = {
	/** Supplying one makes the option or argument optional. */
	default?: T;
	/** The line the help output prints beside it. */
	description?: string;
};

/**
 * What a caller can say about a variadic argument. It has no `default`: a
 * variadic with nothing left to collect is an empty array, never missing.
 */
export type RestMeta = Pick<Meta<unknown>, "description">;

type OptionMeta = {
	name: string;
	schema: Arg<unknown>;
	description?: string;
	hasDefault: boolean;
	default?: unknown;
	/** A switch: present or not, it never takes the next token as its value. */
	isSwitch: boolean;
	/** Given any number of times, each value collected in order. */
	repeated?: boolean;
};

export class Command<O, C extends object = object> {
	private _description = "";
	private options: OptionMeta[] = [];
	private args: OptionMeta[] = []; // positionals, in declaration order
	private variadic: OptionMeta | undefined;
	private middleware: AnyMiddleware[] = [];
	private _action: Action<O, C> = () => {};
	private hasAction = false;
	private unknownOptions = false;
	private excessArguments = false;
	private passThrough = false;

	constructor(readonly name: string) {}

	description(description: string): this {
		this._description = description;
		return this;
	}

	summary(): string {
		return this._description;
	}

	option<K extends string, T>(
		name: K,
		schema: Arg<T>,
		meta?: Meta<T>,
	): Command<O & { [P in K]: T }, C> {
		this.options.push({
			name,
			schema: schema as Arg<unknown>,
			description: meta?.description,
			// only a present `default` key makes the option optional (vs. a lone description)
			hasDefault: meta !== undefined && "default" in meta,
			default: meta?.default,
			isSwitch: takesBooleans(schema as Arg<unknown>),
		});
		return this as unknown as Command<O & { [P in K]: T }, C>;
	}

	/**
	 * An option given any number of times, collecting each value in order as
	 * an array. The schema describes one of them, so
	 * `repeated("tag", z.string())` arrives as `string[]`, empty when it was
	 * never given.
	 */
	repeated<K extends string, T>(
		name: K,
		schema: Arg<T>,
		meta?: RestMeta,
	): Command<O & { [P in K]: T[] }, C> {
		this.options.push({
			name,
			schema: schema as Arg<unknown>,
			description: meta?.description,
			hasDefault: false,
			isSwitch: false,
			repeated: true,
		});
		return this as unknown as Command<O & { [P in K]: T[] }, C>;
	}

	arg<K extends string, T>(
		name: K,
		schema: Arg<T>,
		meta?: Meta<T>,
	): Command<O & { [P in K]: T }, C> {
		if (this.variadic) {
			throw new Error(
				`${this.name}: ${this.variadic.name} takes every remaining argument, so ${name} would never be filled`,
			);
		}
		this.args.push({
			name,
			schema: schema as Arg<unknown>,
			description: meta?.description,
			hasDefault: meta !== undefined && "default" in meta,
			default: meta?.default,
			isSwitch: false,
		});
		return this as unknown as Command<O & { [P in K]: T }, C>;
	}

	/**
	 * The last positional, collecting every argument left over as an array. The
	 * schema describes one of them, so `rest("args", z.string())` arrives as
	 * `string[]`, empty when there was nothing left. Only one is allowed, and
	 * nothing may be declared after it.
	 */
	rest<K extends string, T>(
		name: K,
		schema: Arg<T>,
		meta?: RestMeta,
	): Command<O & { [P in K]: T[] }, C> {
		if (this.variadic) {
			throw new Error(
				`${this.name}: ${this.variadic.name} already takes every remaining argument`,
			);
		}
		this.variadic = {
			name,
			schema: schema as Arg<unknown>,
			description: meta?.description,
			hasDefault: false,
			isSwitch: false,
		};
		return this as unknown as Command<O & { [P in K]: T[] }, C>;
	}

	/**
	 * Lets a flag this command never declared through as an ordinary argument,
	 * for a command that forwards what it is given to another program. Declared
	 * options are still read from the same command line.
	 */
	allowUnknownOption(allow = true): this {
		this.unknownOptions = allow;
		return this;
	}

	/** Lets more arguments arrive than were declared, instead of failing. */
	allowExcessArguments(allow = true): this {
		this.excessArguments = allow;
		return this;
	}

	/**
	 * Stops reading options once the first argument has arrived, so everything
	 * past it is an argument however it is spelled. `cmd --port 80 run` reads
	 * `--port`; `cmd run --port 80` passes it on, with no `--` needed.
	 */
	passThroughOptions(passThrough = true): this {
		this.passThrough = passThrough;
		return this;
	}

	/**
	 * Wraps this command's action, inside whatever the `Cli` already wraps it
	 * with. Has to come before `action`, which is typed against the context the
	 * chain produces.
	 */
	use<Out extends object>(middleware: Middleware<C, Out>): Command<O, Out> {
		if (this.hasAction) {
			throw new Error(`${this.name}: use() must come before action()`);
		}
		this.middleware.push(middleware as unknown as AnyMiddleware);
		return this as unknown as Command<O, Out>;
	}

	action(action: Action<O, C>): this {
		this._action = action;
		this.hasAction = true;
		return this;
	}

	// Of the dependencies only the logger, and the terminal's width for help, are
	// this command's business; the rest of the object it just seeds the context
	// with, for the middleware and action. A command run standalone may leave
	// `ps` out, and its help is then laid out as for a pipe.
	// `path` is the spelling that reached this command, for the usage line; the
	// cli dispatching here passes it, a command run standalone is just its name.
	exec(
		argv: string[],
		deps: Pick<Deps, "log"> & Partial<Pick<Deps, "ps">>,
		outer: AnyMiddleware[] = [],
		path = this.name,
	): unknown {
		if (this.wantsHelp(argv)) {
			this.help(deps.log, path, deps.ps?.columns());
			return;
		}
		const opts = this.parse(argv);
		const chain = [...outer, ...this.middleware];
		// Without middleware there is nothing to await, and a sync action stays
		// sync, parse errors included.
		if (chain.length === 0) {
			return this._action(opts, deps as unknown as C);
		}
		let result: unknown;
		const run = compose(chain, async (ctx) => {
			result = await this._action(opts, ctx as C);
		});
		return run(deps).then(() => result);
	}

	/**
	 * Whether this run is asking for help rather than doing anything. Only what
	 * is still being read as an option counts: past a `--`, or past the first
	 * argument of a pass-through command, `--help` belongs to whatever this
	 * command forwards to.
	 */
	private wantsHelp(argv: string[]): boolean {
		for (let i = 0; i < argv.length; i++) {
			const token = argv[i];
			if (token === "--") {
				return false;
			}
			if (token === "--help" || token === "-h") {
				return true;
			}
			if (this.passThrough && token !== undefined && !this.isValue(argv, i)) {
				return false;
			}
		}
		return false;
	}

	// The token after a bare `--option` is that option's value, which is what
	// makes it not the first argument a pass-through command stops reading
	// options at. A switch takes no value, so what follows it stands alone.
	private isValue(argv: string[], i: number): boolean {
		const token = argv[i];
		if (token?.startsWith("-")) {
			return true;
		}
		const previous = argv[i - 1];
		if (previous === undefined || !previous.startsWith("--")) {
			return false;
		}
		return !previous.includes("=") && !this.isSwitch(previous.slice(2));
	}

	private isSwitch(name: string): boolean {
		return this.options.some(
			(option) => option.name === name && option.isSwitch,
		);
	}

	private parse(argv: string[]): O {
		const raw = new Map<string, string>();
		const repeats = new Map<string, string[]>();
		// a repeated option keeps every value it is given; the rest keep the last
		const give = (option: OptionMeta, value: string) =>
			option.repeated
				? repeats.set(option.name, [...(repeats.get(option.name) ?? []), value])
				: raw.set(option.name, value);
		const positional: string[] = [];
		for (let i = 0; i < argv.length; i++) {
			const token = argv[i];
			if (token === undefined) {
				continue;
			}
			// a bare `--` ends option processing: what follows is arguments, however
			// it is spelled, and the separator itself is not one of them
			if (token === "--") {
				positional.push(...argv.slice(i + 1));
				break;
			}
			const stopped = this.passThrough && positional.length > 0;
			if (!token.startsWith("--") || stopped) {
				positional.push(token);
				continue;
			}
			const eq = token.indexOf("=");
			const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
			// Before anything binds: a typo is likelier than a missing value, so
			// `cmd --grep x` reports the flag it does not know rather than the
			// argument it thinks you left out. A command that forwards its arguments
			// says so, and then an unknown flag is one of them.
			const option = this.options.find((option) => option.name === name);
			if (option === undefined) {
				if (!this.unknownOptions) {
					throw new Error(`unknown option --${name}`);
				}
				// no value is taken with it: the parser cannot know the arity of a
				// flag it has never heard of, so the next token stands on its own
				positional.push(token);
				continue;
			}
			if (eq !== -1) {
				give(option, token.slice(eq + 1));
			} else {
				const next = argv[i + 1];
				if (!option.isSwitch && next !== undefined && !next.startsWith("--")) {
					give(option, next);
					i++;
				} else {
					give(option, "true"); // bare switch
				}
			}
		}
		const extra = positional[this.args.length];
		if (extra !== undefined && !this.variadic && !this.excessArguments) {
			throw new Error(`unexpected argument "${extra}"`);
		}
		const out: Record<string, unknown> = {};
		// positionals bind by order, so a bare option before them steals one
		// (`cmd --port task`); a switch never does
		this.args.forEach((arg, i) => {
			const value = positional[i];
			if (value === undefined) {
				if (arg.hasDefault) {
					out[arg.name] = arg.default;
					return;
				}
				// a schema that accepts absence already says it is allowed, so asking
				// for `default: undefined` as well would be saying it twice
				const missing = absent(arg.schema);
				if (missing !== null) {
					out[arg.name] = missing.value;
					return;
				}
				throw new Error(`missing required argument <${arg.name}>`);
			}
			out[arg.name] = read(arg.schema, value);
		});
		if (this.variadic) {
			const rest = this.variadic;
			out[rest.name] = positional
				.slice(this.args.length)
				.map((value) => read(rest.schema, value));
		}
		for (const opt of this.options) {
			if (opt.repeated) {
				out[opt.name] = (repeats.get(opt.name) ?? []).map((value) =>
					read(opt.schema, value),
				);
				continue;
			}
			const value = raw.get(opt.name);
			if (value === undefined) {
				if (opt.hasDefault) {
					out[opt.name] = opt.default;
					continue;
				}
				const missing = absent(opt.schema);
				if (missing !== null) {
					out[opt.name] = missing.value;
					continue;
				}
				// a switch left off is off, not missing
				if (opt.isSwitch) {
					out[opt.name] = false;
					continue;
				}
				throw new Error(`missing required option --${opt.name}`);
			}
			out[opt.name] = read(
				opt.schema,
				opt.isSwitch ? onOff(opt.name, value) : value,
			);
		}
		return out as O;
	}

	private optionRow(option: OptionMeta): readonly [string, string] {
		// an undefined default is the option being absent, which is not news
		const defaultDescription =
			option.hasDefault && option.default !== undefined
				? color.dim(` (default: ${JSON.stringify(option.default)})`)
				: "";
		return [
			`--${option.name}`,
			`${option.description ?? ""}${defaultDescription}`,
		];
	}

	private help(log: Logger, path: string, width: number | undefined): void {
		const args = this.args.map((arg) =>
			arg.hasDefault ? `[${arg.name}]` : `<${arg.name}>`,
		);
		if (this.variadic) {
			args.push(`[${this.variadic.name}...]`);
		}
		const usage = [
			color.bold(path),
			color.dim([...args, "[options]"].join(" ")),
		].join(" ");
		const lines = [`${color.bold("Usage:")} ${usage}`];
		if (this._description) {
			lines.push("", ...wrap(this._description, width));
		}
		const named = this.variadic
			? [...this.args, { ...this.variadic, name: `${this.variadic.name}...` }]
			: this.args;
		if (named.length > 0) {
			lines.push(
				"",
				color.bold("Arguments:"),
				...table(
					named.map((arg): Row => [arg.name, arg.description ?? ""]),
					color.blue,
					width,
				),
			);
		}
		lines.push("", color.bold("Options:"));
		const rows = [
			...this.options.map((option) => this.optionRow(option)),
			["-h, --help", "show this help"] as const,
		];
		lines.push(...table(rows, color.blue, width));
		log.info(lines.join("\n"));
	}
}

/** Validates a command-line value and reports the first issue with its path. */
function read<T>(schema: Arg<T>, raw: unknown): T {
	const result = schema["~standard"].validate(raw);
	if (result instanceof Promise) {
		throw new Error(
			`${schema["~standard"].vendor} validated asynchronously, which is not supported here`,
		);
	}
	if (result.issues === undefined) {
		return result.value;
	}
	const issue = result.issues[0];
	const path = (issue?.path ?? [])
		.map((segment) =>
			String(typeof segment === "object" ? segment.key : segment),
		)
		.join(".");
	const message = issue?.message ?? "invalid";
	throw new Error(path ? `${path}: ${message}` : message);
}

/**
 * Whether an option is a switch: its schema keeps the booleans true and false
 * as they are and refuses a string, as `z.boolean()` does and
 * `z.coerce.number()` (true is 1) does not. Asked of the schema rather than
 * of its library, so it holds for any Standard Schema.
 */
function takesBooleans(schema: Arg<unknown>): boolean {
	const keeps = (value: unknown) => {
		const result = schema["~standard"].validate(value);
		if (result instanceof Promise) {
			result.catch(() => {}); // async is refused when it is used instead
			return false;
		}
		return result.issues === undefined && result.value === value;
	};
	return keeps(true) && keeps(false) && !keeps("true");
}

/** A switch's value: a bare `--name` is `"true"`; `--name=` says it outright. */
function onOff(name: string, raw: string): boolean {
	if (raw !== "true" && raw !== "false") {
		throw new Error(`--${name}: expected true or false, got "${raw}"`);
	}
	return raw === "true";
}

/** A schema accepting undefined can allow absence or supply its own default. */
function absent(schema: Arg<unknown>): { value: unknown } | null {
	const result = schema["~standard"].validate(undefined);
	if (result instanceof Promise || result.issues !== undefined) {
		return null;
	}
	return { value: result.value };
}
