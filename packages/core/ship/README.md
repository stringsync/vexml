# core/ship

A project's ship targets, declared as plain objects: what it ships, what
ships first, and the steps one ship takes. Nothing here runs a step:
`target()` and `step()` only return objects, and planning a target only
returns its steps, so importing a target file or showing its plan is safe.
The design is `splates/designs/ship.md`. It replaces `core/legacy-ship` and
shares nothing with it.

```ts
// mdom/ship.ts
import { step, target } from "core/ship";

export const mdom = target({
	name: "@stringsync/mdom",
	bump: "patch",
	dependencies: [],
	plan: ({ bump }) => [
		step({
			id: "test",
			does: "Run mdom's tests",
			run: (ctx) => ctx.sh("bin/mdom test"),
		}),
		step({
			id: "publish",
			does: `Publish @stringsync/mdom at the next ${bump}`,
			dependencies: ["test"],
			done: (ctx) => published(ctx),
			run: (ctx) => ctx.sh("npm publish"),
		}),
	],
});
```

- A **target** has a `name`, the `bump` it takes by default (left out for a
  deployment, which takes none), the `dependencies` that ship before it, by
  target name, and `plan`, which returns the steps of one ship.
- A **step** has an `id`, the `does` line the review screen shows, the
  `dependencies` among its target's steps that finish first, an optional
  `done` saying whether it already happened, and `run`. Steps with no order
  between them may run in parallel. Both `done` and `run` take a `Ctx`.
- A **`Ctx`** is all a step touches: `sh`, `update`, `released`, `confirm`,
  `openLink` and `ask`. A test hands in its own.

A dependent reads what a target it depends on released through `upstream`:

```ts
plan: ({ upstream }) => [
	step({
		id: "pin-mdom",
		does: `Pin @stringsync/mdom to ${upstream("@stringsync/mdom").version}`,
		run: (ctx) => pin(ctx, upstream("@stringsync/mdom").version),
	}),
],
```

`steps(target, { bump, upstream })` plans one ship and checks it: step ids
unique, and every step's `dependencies` naming a step of the plan, with no
cycle. A bump given to a target that takes none is refused, and `upstream`
answers only for the target's own `dependencies`. `view(target, ...)` returns
the same plan as plain data, without `done` or `run`, ready to print as JSON
for a review screen:

```ts
view(mdom, { bump: "minor" });
// { name: "@stringsync/mdom", bump: "minor", dependencies: [],
//   steps: [
//     { id: "test", does: "Run mdom's tests" },
//     { id: "publish", does: "Publish @stringsync/mdom at the next minor", dependencies: ["test"] },
//   ] }
```

A target may also declare `unshipped(ctx)`, returning how many commits are
not yet shipped; `commitsSince(ctx, { tag, paths })` counts those since a git
tag. `ship plan` runs it and puts the count in the plan as `unshipped`; a
target declaring nothing leaves the field out.

## Serving a target

splates never imports a target. The project's CLI hands its targets to
`serve`, which answers three requests, and runs a whole ship for someone at
a terminal when given none:

```ts
// under `bin/mdom ship`
import { serve } from "core/ship";
import { mdom } from "../ship";

await serve(mdom, argv); // or serve([staging, prod], argv)
```

```sh
bin/mdom ship plan --bump minor      # the plan as JSON, as view() returns it
bin/mdom ship done publish           # true or false
bin/mdom ship run publish            # runs one step, writing JSON lines
bin/mdom ship --bump minor           # shows the plan, asks, ships it all here
```

Every request takes `--bump`, `--target <name>` and `--upstream
<name>=<version>`, once for each target it depends on. With several targets,
`plan` with no `--target` prints an array of plans, and the rest need one.
`plan` shows an upstream it was not given as "the version <name> releases";
the others refuse to plan without it.

A step that publishes calls `ctx.released(version)`. A `done` that finds the
release already out calls it too: `done` still prints `true`, and the released
line goes to stderr with the rest of what `done` says, so a skipped step can
still tell its dependents.

`run` writes one JSON object per line: `{"type":"output","text"}` for what a
command printed, `{"type":"update","line"}`, `{"type":"released","version"}` once a
step calls `ctx.released(version)` (splates passes it to dependents as
`--upstream`), and on failure
`{"type":"error","message"}` last, then exits 1. `ctx.sh` throws when its
command exits non-zero, naming it and the end of its output, which fails the
step.

### Prompts

`confirm`, `openLink` and `ask` put a question to the user and wait. Under
`run`, each writes a prompt line with an id, and the step waits for the
answer line naming that id on `run`'s stdin:

```jsonl
{"type":"prompt","id":"1","kind":"confirm","question":"Deploy prod?"}
{"type":"prompt","id":"2","kind":"link","url":"https://device.sso…","code":"SDKQ-WXPL"}
{"type":"prompt","id":"3","kind":"ask","question":"One-time code?"}
```

```jsonl
{"type":"answer","id":"1","value":true}
{"type":"answer","id":"2"}
{"type":"answer","id":"3","value":"123456"}
```

A confirm takes `true` or `false`, an ask a string, and a link anything,
once the user is through. Each prompt takes an optional `{ signal }`;
aborting it writes `{"type":"withdrawn","id"}`, so the page closes the card,
and the call rejects. Nothing is kept: a step stopped while it waits asks
again when it runs again, and once stdin closes a waiting step fails, since
nobody is there to answer. `done` cannot ask, so a prompt there fails. In a
terminal, prompts ask on stdin.

`ctx.sh(command, { prompts: true })` runs a command that asks a person at a
terminal (`aws sso login`, `npm login`, `cdk deploy`) with its stdin open.
Each time it goes quiet for a second, what it last printed is read:

- an unfinished line with `[y/N]` or `(y/n)` is a confirm, answered by
  typing `y` or `n`;
- another unfinished line ending in `:` or `?` is an ask, the value typed in;
- a link printed with a device code (`ABCD-EFGH`), or beside words about
  signing in, is a link, withdrawn once the command prints more or ends.

The terminal runner starts each step once those it depends on finish, so
steps with no order between them run together, skips a step whose `done`
says it already happened, and stops starting steps at the first failure.

## Placeholder chunks

`placeholder` holds chunks for trying a ship that sends nothing out, for the
placeholder ships the user hand tests and for the engine's tests. Each
returns steps to spread into a plan, its last step named by the `id` given:

```ts
import { placeholder, target } from "core/ship";

export const trial = target({
	name: "placeholder",
	plan: () => [
		...placeholder.wait({ id: "slow", seconds: 10, branches: 3 }),
		...placeholder.prompts({ id: "ask", dependencies: ["slow"] }),
		...placeholder.failUntil({ id: "fix", marker: "/tmp/ship-fixed", dependencies: ["ask"] }),
	],
});
```

- `wait` waits `seconds`, updating its line each second; with `branches`
  that many waits run side by side, then `<id>`.
- `failUntil` fails until a file exists at `marker`, so `touch` it to fix
  the step and retry.
- `prompts` asks a confirm, a sign-in link and a value at once, then `<id>`;
  answering no fails the confirm.

## Deploying a CDK stack

`aws.deploy(stack, { profile, dependencies })` deploys one stack of a CDK
app with the CDK CLI, run in the folder holding the app's `cdk.json`:

```ts
import { aws, target } from "core/ship";

export const staging = target({
	name: "net-staging",
	plan: () =>
		aws.deploy(
			{ name: "Staging/Network", app: "net/packages/net" },
			{ profile: "staging" },
		),
});
```

- **sign-in** runs `aws sso login` with a device code when the profile's
  session has lapsed, so the link and code reach the user as a prompt. A
  deploy with no `profile` takes the environment's credentials and has no
  sign-in.
- **diff** shows what the deploy changes, and asks the user to confirm one
  that adds IAM or security group rules or replaces a resource; a No fails
  the step.
- **deploy** is skipped when `cdk diff` finds the stack already matches this
  checkout, so a resumed ship deploys nothing twice.
- **verify** fails unless the deployed stack matches this checkout.

## Publishing to npm

`npm.release({ package, bump, repository, test, keep, dependencies })` publishes a
package of mono from its public mirror, through a GitHub workflow npm
trusts:

```ts
import { npm, target } from "core/ship";

export const mdom = target({
	name: "@stringsync/mdom",
	bump: "patch",
	plan: ({ bump = "patch" }) =>
		npm.release({
			package: "@stringsync/mdom",
			bump,
			repository: "stringsync/mdom",
			test: "bin/mono test @stringsync/mdom",
		}),
});
```

- **test** runs `test` from mono's root.
- **version** takes npm's latest version raised by the bump, or the
  package's own the first time, and keeps it beside the mirror's checkout
  (in mono's git folder, under `ship/npm/`), so a resumed release keeps it.
- **workflow** commits `.github/workflows/publish.yml` to the mirror when
  it differs: the job checks out the release commit, installs, builds the
  package and runs `npm publish` on the build.
- **mirror** writes the mirror: the project folder at its root, without
  what only agents read, and the `core` folders it reaches under
  `packages/core`, with the tooling mono's root would give it. A
  `workspace:` dependency on a package outside the mirror takes the version
  npm has, so ship that one first. The project's `mirror/` folder, when it
  has one, is laid over the mirror's root and not copied itself, for files
  only the mirror has (its guide, Dockerfile, workflows); `keep: ["skills/x/**"]`
  carries paths the mirror would leave out. It installs and builds there, then
  pushes `Release <package> <version>`.
- **login** signs in to npm (`npm login --auth-type=web`) only when
  `npm whoami` fails, so a signed-in machine skips it; the login link reaches
  the user as a prompt.
- **first-publish**, only for a package npm has never had, builds and
  publishes from this machine, since npm trusts a workflow only for a
  package it has.
- **trust** runs `npm trust github` when npm does not yet trust the
  workflow (it needs npm 11.15 or later and the account's second factor).
- **publish** runs the workflow on the release commit and waits until npm
  has the version, failing when the run fails.
- **tag** creates the GitHub release, tagging `v<version>` with its notes.

The login, first-publish and trust steps run npm under a pseudo-terminal
(`script`), since npm starts its web sign-in and one-time-password flow only
for a terminal; the sign-in and second-factor links reach the user as prompts. The build (`bun packages/core/ship/npm/cli.ts
build <folder>`, what the workflow runs) writes `dist/`: JavaScript with
`core` and any private workspace package bundled in, declarations under
`dist/types` pointed at each other rather than at those packages, the files
the manifest's `files` and non-TypeScript exports name, and a manifest
whose dependencies are what the build imports, with their `@types/`.
