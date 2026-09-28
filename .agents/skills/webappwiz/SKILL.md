---
name: webappwiz
description: "Check whether the webappwiz package already covers a piece of infrastructure before writing it by hand or adding a dependency for it. Read this before writing any of: time, clocks, durations or timers; logging; id generation; CLI argument parsing; background tasks or queues; web workers; markdown parsing; typed event emitters; 2D geometry or spatial indexes; filesystem, env or process access; AbortSignal plumbing; disposable resources; browser scroll, animation frames or visibility. Also use when asked to update or upgrade webappwiz in a project, and whenever the user says webappwiz."
version: 0.0.20
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
  schema, so numeric args and options need `z.coerce.number()`. A bare flag
  arrives as `"true"`. To preserve the old boolean behavior exactly, use
  `z.string().transform((raw) => raw !== "false")`. `z.stringbool()` is
  suitable when you want recognized boolean spellings instead.
  `z.coerce.boolean()` converts `"false"` to true and is not a replacement.
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
