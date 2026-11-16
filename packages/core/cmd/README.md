# core/cmd

Builds a CLI: subcommands, positional `.arg()`s and `--flag` options typed by
[Zod](https://zod.dev) or any other [Standard Schema](https://standardschema.dev),
and generated `--help`.

```ts
import { cli } from "core/cmd";
import { z } from "zod";

export const app = cli("app");

app
	.command("greet")
	.description("say hello")
	.arg("name", z.string(), { description: "who to greet" })
	.option("loud", z.boolean(), { default: false })
	.action((opts, { log }) => log.info(opts.loud ? "HI" : "hi", opts.name));

await app.run({});
```

```bash
app greet ada --loud
app greet --loud ada
```

An arg or option without a `default` is required. Their types accumulate, so
`opts` is fully typed in `action`. Args bind by declaration order, and an
option takes the next argument as its value, so put options after them:
with `.option("port", z.coerce.number())`, `app serve --port 80` reads `80`
as the port.

An option whose schema is a boolean, like `z.boolean()`, is a switch instead:
false when left off, true for a bare `--loud`, and `--loud=false` or
`--loud=true` to say so outright. It never takes the next argument as its
value, so it can come before the args as well as after. The parser asks the
schema whether it keeps `true` and `false` and refuses a string, so this
works the same in any schema library.

A flag the command never declared is an error, and so is a positional past
the ones it does, since the alternative is a typo running the command anyway
with a default the caller thought they had overridden. A command that exists
to forward what it is given opts out of both, with the flags below. A reason
or message that reads as prose has to be quoted to arrive as one argument.

`rest` is the last positional, taking everything left over. Its schema
describes one of them and `opts` gets an array, empty when there was nothing
left, so it is never missing and never has a `default`. Only one is allowed,
and declaring anything after it throws where it is declared.

```ts
app
	.command("run")
	.arg("script", z.string())
	.rest("args", z.string(), { description: "passed to the script" })
	.action((opts, { ps }) => ps.spawn([opts.script, ...opts.args])); // string[]
```

```bash
app run build --watch    # help shows: app run <script> [args...] [options]
```

An option given any number of times is `repeated()`, which collects each
value in order, as an array, empty when it was never given:

```ts
app
	.command("tag")
	.repeated("label", z.string(), { description: "a label to add" })
	.action((opts) => opts.label); // string[]
```

```bash
app tag --label bug --label=urgent   # { label: ["bug", "urgent"] }
```

## Forwarding

Three per-command flags relax the parsing, for a command that wraps another
program. They are named after [commander](https://github.com/tj/commander.js)'s,
and mean what they do there.

```ts
app
	.command("test")
	.allowUnknownOption()
	.arg("pkg", z.string(), { default: "" })
	.rest("args", z.string())
	.action((opts, { ps }) => ps.spawn(["bun", "test", opts.pkg, ...opts.args]));
```

```bash
app test web viewframe --watch   # { pkg: "web", args: ["viewframe", "--watch"] }
```

- `allowUnknownOption()` takes a flag this command never declared as an
  ordinary argument, so it flows into the positionals and on into `rest`.
  Declared options are still read from the same command line, and no value is
  taken along with an unknown flag: the parser cannot know the arity of a flag
  it has never heard of.
- `allowExcessArguments()` lets more arguments arrive than were declared,
  which a command with no `rest` needs to tolerate them at all.
- `passThroughOptions()` stops reading options at the first argument, so
  `app serve --port 80 run` reads `--port` and `app serve run --port 80`
  passes it on.

`--` ends option processing whatever those flags say: everything after it is
an argument however it is spelled, and the `--` itself is not one of them.
That covers `--help` too, so `app test -- --help` forwards the flag instead of
printing this program's help.

Only long flags are parsed. There is no `-f` for `--force`, and no bundling:
the only short flag is `-h`.

## Schemas

`arg` and `option` take any Standard Schema, so bring Zod, Valibot or
arktype if you already have one:

```ts
import { z } from "zod";

app
	.command("serve")
	.arg("dir", z.string())
	.option("port", z.coerce.number(), { default: 3000 })
	.action(/* … */);
```

**Reach for the coercing form.** A command line arrives as strings, so
`z.coerce.number()` works where `z.number()` refuses "3000".
For an on/off switch, use `z.boolean()`. Not `z.coerce.boolean()` or
`z.stringbool()`: they take strings, so the option takes the next argument
as its value, and `z.coerce.boolean()` turns the string `"false"` into true.

Validation is synchronous. Async schemas are unsupported. Validation errors
are ordinary errors naming the first issue and its dotted path.

Whether an argument may be left out is put to the schema by validating
absence, so `z.string().optional()` says it may, and `z.string()
.default("x")` both says it may and supplies the value. A `default` in the
`meta` argument says the same thing from the outside, and wins.

## Dependencies

Nothing is instantiated to declare a cli: `run` is handed the dependencies, and
they arrive as the context every action receives. So the declaration is a value
a test can import and run with fakes, rather than a module that reaches for the
real filesystem the moment it loads.

```ts
// app.ts
interface AppDeps extends Deps {
	fs: Fs;
}

export const app = cli<AppDeps>("app");

app.command("list").action((opts, { fs, log }) => /* … */);

// index.ts, the bin: the only place a real dependency is made
await app.run({ fs: new NodeFs() });

// app.test.ts
await app.run({ log: new MemoryLogger(), ps: new FakePs(), fs: new FakeFs() }, ["list"]);
```

`Deps` is the minimum: a `Logger` to print help and errors through, and a `Ps`
to exit with and to read the terminal's width from. On a terminal, help wraps
each description to fit, back to its own column rather than the left edge, and
parts the rows with blank lines once any wraps; piped, every row stays one
line, so grep finds it whole. A program's own type extends it with whatever its commands need.

Actions always get both, but a caller need not supply them: `run` fills in a
`ConsoleLogger` and a `NodePs` when they are left out, and reads `argv` from
the process. Only a test that wants to see what was printed, or to run a
program against arguments the process was not given, passes its own.

## Groups

`group` nests a set of subcommands under one name. A group is a cli itself, so
it takes `use` and `command` the same way and prints the same help. Only its
name is longer.

```ts
const skills = app.group("skills").description("manage skills");

skills.command("add").arg("skill", z.string()).action(/* … */);
skills.command("update").action(/* … */);
```

```bash
app skills add scry
app skills --help      # lists add and update
```

A failure anywhere in the tree is reported and exits once, at the root.

`fallback` names the subcommand a group runs when its first argument names
none of the others, so the group reads as a command of its own:

```ts
const scry = app.group("scry").fallback("check");
scry.command("check").arg("dir", z.string(), { default: "." }).action(/* … */);
scry.command("add").arg("rule", z.string()).action(/* … */);
```

```bash
app scry            # runs check
app scry ./web      # runs check on ./web
app scry add foo    # still adds
app scry --help     # lists both, check marked (default)
```

`mount` hangs one cli on another, which is how one program carries another's
commands as a subcommand instead of shelling out to it. Help names every
command by the path it was reached through, so the same cli answers correctly
under both spellings.

```ts
export const tool = cli<AppDeps>("tool");
tool.command("update").action(/* … */); // tool update

app.mount("tool", tool);                // app tool update
```

The type argument is what keeps that honest: a program can only mount a cli
whose dependencies it already promises to run with.

## Middleware

`use` wraps a command's action with setup, teardown, and whatever an action
should not be doing itself. What a middleware hands to `next` becomes the
context the action receives, so the context type accumulates the way options
do.

```ts
function database<C extends Deps>(url: string): Middleware<C, C & { db: Db }> {
	return async (ctx, next) => {
		const db = await connect(url);
		try {
			await next({ ...ctx, db });
		} finally {
			await db.close();
		}
	};
}

const app = cli<AppDeps>("app").use(database<AppDeps>(DATABASE_URL));

app
	.command("users")
	.action((opts, ctx) => ctx.db.query("select * from users"));
```

Middleware runs after `--help` and after options are parsed, so it only ever
wraps the action: `app users --help` never opens the connection, and a bad
flag still fails before any setup happens.

`use` must come before the things it wraps: `cli.use` before `command`, and
`command.use` before `action`, both of which fix the context type at the point
they are called. Either one throws if called late. A command's own middleware
runs inside the cli's.

Middleware factories that declare a `Middleware<C, Out>` return type infer at
the call site. Inline middleware needs its output context spelled out, since
TypeScript will not infer a type argument from how a callback parameter is
used:

```ts
app.use<{ user: string }>(async (ctx, next) => next({ ...ctx, user: "ada" }));
```

With no middleware registered, a synchronous action still returns
synchronously; only a chain makes `run` return a promise.

`timed()` is one that ships: it says how long the command took, on stderr,
as the process ends, so a command that exits with its own code through
`ps.exit` is timed too.

```ts
app.command("check").use(timed()).action(check);
// done in 1m 12s
```
