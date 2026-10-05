---
name: webappwiz
description: "Check whether the webappwiz package already covers a piece of infrastructure before writing it by hand or adding a dependency for it. Read this before writing any of: time, clocks, durations or timers; logging; id generation; CLI argument parsing; background tasks or queues; web workers; markdown parsing; typed event emitters; 2D geometry or spatial indexes; filesystem, env or process access; API keys, tokens, secrets or credentials; AbortSignal plumbing; disposable resources; browser scroll, animation frames or visibility. Also use when asked to update or upgrade webappwiz in a project, and whenever the user says webappwiz."
version: 0.0.36
---

# Using webappwiz

`webappwiz` is the parts of a web app that get written again every time, behind
interfaces a test can replace. One package, one subpath per module. Before
writing any of that here, find out whether it already exists there.

Its README carries the whole catalogue, a table of every subpath and what it is
for. Read it from `node_modules/webappwiz/README.md`, or, in a project that has
not installed it yet, from
`https://raw.githubusercontent.com/jaredjj3/webappwiz/main/packages/webappwiz/README.md`.

Nothing in the table is close: say so in a line and write it here. Something is:
read that module's own README and the exports of its `index.ts`, and judge
against what is actually needed rather than the one-line blurb.

## It fits

`bun add webappwiz` and import the subpath. There is no package entry point, so
import `webappwiz/time`, never `webappwiz`. Fakes live under `/testing` beside
what they replace.

## It nearly fits

Do not vendor it, fork it, or patch `node_modules`. Write what this project
needs here so nobody is blocked, leave a `TODO: webappwiz/<subpath> once <gap>`
on it, and hand the gap over: print the block below and tell the user to give it
to an agent working on the webappwiz repo.

```markdown
In `packages/webappwiz/<subpath>`: <the gap, in a sentence>.

Wanted by <this project> for <the usecase, concretely>.

What is there now: <the export that comes closest, and where it stops>.
What is missing: <the smallest change that closes the gap: one more method, a
widened parameter, another implementation of an interface>.
Called like: <the call site, written the way the caller wants to write it>.
```

Describe the gap and stop. Do not design the API in the handoff: that repo has a
style guide and a review, and neither of them is here.

## It does not fit

One line naming the subpath you read and why it is not the one, then write it
here. A wrong module taken up is worse than one written twice.

## Credentials

An API key, token or other secret a project's code needs comes from
`webappwiz/creds`. Code reads it through `Credentials`, over a list of
sources it chooses for each place the app runs; the first source with a
value wins. Never put a secret in source, a config file, a test, or a
command line, never write a `.env` file yourself, and never ask for one in
chat.

### Which source, where

From most to least locked down:

1. **The system's secret store**, `SystemSecretStore`: the Keychain,
   Credential Manager, or a Linux secret service. Encrypted at rest, held
   apart from files and the environment, so no file read, `env` dump, child
   process, or agent sees a value. Use it on a person's machine, and only it.
   - `SystemSecretStore.forProject()`, kept as `webappwiz:<project>`: keys
     the app itself uses, like a Stripe test key. One project's keys are
     never another's.
   - `SystemSecretStore.device()`, kept as `webappwiz`: keys that belong to
     the person and serve many projects, like the tokens scry runs on. Wider
     reach, so only for keys that really are shared.
2. **A hosted secrets manager** (1Password, Vault, AWS or GCP Secret
   Manager), as a source of the app's own: any object with a `label` and an
   async `get(name)`. Fetched at runtime and access-controlled. Use it where
   the app is deployed, when the project has one.
3. **The environment**, `Environment`: how CI, containers and hosting
   platforms hand a deployed app its secrets. Every child process inherits
   it, and it shows up in crash reports and debug dumps. Use it where the
   app is deployed. On a person's machine it means exports in a shell
   profile, which every program they run can read, so leave it out of the
   development list.
4. **A `.env` file**, `DotenvFile(path)`: plaintext on disk, one mistake
   from being committed, and read by any tool or agent that opens it. Use it
   only where a deploy target insists on one, never on a person's machine.
   Under Bun, `.env` files are loaded into the environment already, so
   `Environment` covers them there.

How the app tells development from production, and which sources each
lists, is the project's choice: ask the user when the project does not
already say. The usual lists:

```ts
import {
	Credentials,
	Environment,
	SystemSecretStore,
} from "webappwiz/creds";

const credentials =
	process.env.APP_ENV === "development"
		? new Credentials([
				await SystemSecretStore.forProject(),
				SystemSecretStore.device(),
			])
		: new Credentials([new Environment()]);
const key = await credentials.require("STRIPE_SECRET_KEY");
```

A tool that reads only its environment, like Prisma, Vite or `wrangler`,
never calls `Credentials`. In development, run it through
`bunx @webappwiz/cli creds run -- <command>`, which hands it the stored
keys for that run alone, usually from a `package.json` script; never reach
for a `.env` file or an export to feed it.

`Credentials` is a source itself, so a fallback pattern of the project's
own is a list of lists: `new Credentials([vault, new
Credentials([new Environment(), new DotenvFile(".env")])])` reads the
vault, then the environment, then the file. `forProject()` finds the
store's name itself, so never write a project name into code. Take the
`Credentials` as a dependency, so a test hands in one over
`FakeSecretStore` from `webappwiz/creds/testing`.

### Adding one

1. Name it in `.wiz/config.ts`, by its environment variable name, with what
   it is for. `creds add` takes any name, but a named one shows as missing
   until someone keeps it, so whoever clones the project knows it is needed:

   ```ts
   export default {
   	credentials: { names: { STRIPE_SECRET_KEY: "Stripe, for checkout" } },
   };
   ```

2. Run `bunx @webappwiz/cli creds list` to see which are missing. It
   never prints a value. For each missing one, ask the user to run
   `bunx @webappwiz/cli creds add <NAME>` themselves, with `--device` for a
   key that is theirs rather than the project's: it asks for the value at a
   prompt that shows nothing, and refuses when there is no terminal, so you
   cannot and should not run it for them. `creds remove <NAME>` deletes
   one.

Nothing reads a value back out for you to see, and nothing should: do not
print one, log one, or look one up with the system's own tools
(`security`, `secret-tool`, `cmdkey`). Code that needs a value reads it
itself.

## Updating

`bunx @webappwiz/cli update` rewrites every webappwiz dependency under the
directory to one version, since they are released together and a project
running two of them at different versions is running a combination nobody
tested. The version is the one you invoked, which is what `bunx` is for.
Installed skills and copied rules are refreshed with it, and local edits to
those do not survive.

It edits manifests and stops. Nothing is installed until you run `bun install`
yourself, and nothing is verified until you run this project's typecheck and
tests.

What broke is read the same way as anything else here: the module's own README
and the exports of its `index.ts`, not the one-line blurb and not a guess. If
the new version dropped what this project was using, check the migrations below
first. For removals not covered there, that is a gap: leave the
local code working, and hand it over with the block above. Do not vendor,
fork, or patch `node_modules` to get the build green.

### Migrating removed `webappwiz/t` and `webappwiz/config`

These modules have been removed in favor of Zod and ordinary typed settings.
If the project imports either subpath, migrate those callers as part of the
update. This is an intentional replacement, so do not request their restoration
through the gap handoff above.

Add Zod as a direct dependency in each package importing it (`bun add zod`),
then replace `import { t } from "webappwiz/t"` with
`import { z } from "zod"`. Primitive, object, array, enum, optional, and
nullable builders have Zod equivalents. Replace `Infer<typeof schema>` with
`z.infer<typeof schema>`; replace custom `Schema` implementations and
`SchemaBase` subclasses with Zod schemas, refinements, or transforms.

Check behavior at each input boundary:

- `.parse()` and `.safeParse()` validate through Zod. Replace
  `SchemaError.path` and `.reason` with `ZodError.issues`, using each issue's
  `path` and `message`. For `validate(schema, value)`, use
  `schema.parse(value)` when the schema is Zod; for other libraries, use
  their parser or the Standard Schema interface.
- Zod has no per-schema `.coerce(raw)` method. Use
  `z.coerce.number().parse(raw)` for numeric strings. Decode JSON strings
  before validating object or array schemas, handling malformed JSON too.
- `webappwiz/cmd` still accepts Standard Schema. It passes strings to the
  schema, so numeric args and options need `z.coerce.number()`. Declare an
  on/off switch as `.option("name", z.boolean(), { default: false })`: it is
  false unless given, `--name=false` turns it off, and a bare `--name` never
  takes the next argument as its value. `z.coerce.boolean()` converts
  `"false"` to true and is not a replacement.
  Command validation remains synchronous and reports an ordinary `Error`
  with the first issue's dotted path and message.
- Zod numbers reject infinity. Object schemas still strip extra keys, but
  missing optional properties are omitted rather than added as `undefined`;
  their inferred object keys are optional too. Check callers that enumerate
  keys or rely on exact error wording.

Replace `Config.factory(shape)` with `z.object(shape)`, `config.get("key")`
with typed property access, and `config.toRecord()` with the parsed object.
Use `z.infer<typeof Settings>` instead of `InferConfig`. If freezing matters,
wrap the parsed object in `Object.freeze()`, which preserves the old shallow
freeze. For example:

```ts
import { z } from "zod";

const Settings = z.object({
  host: z.string(),
  port: z.number(),
});
type Settings = z.infer<typeof Settings>;

const Environment = Settings.extend({ port: z.coerce.number() });
const settings = Object.freeze(Environment.parse(process.env));
const updated = Object.freeze(Settings.parse({ ...settings, port: 9090 }));
```

Keep environment decoding separate from strict settings validation when
replacing `factory.coerce()` and `config.update()`. Updates merge parsed
settings and revalidate them; do not rerun input transforms on their output
unless those transforms accept that output. Boolean and JSON environment
values need the explicit decoding described above.

After migrating, run the project's typecheck and tests, including invalid
inputs, absent/defaulted options, boolean flags, and settings updates used by
the project.

## Rules

- Never edit the webappwiz repository from this project's thread.
- Never copy its source into this project.
- Reading the table is the whole check, and it is cheap. Do it before adding a
  dependency, not after.
