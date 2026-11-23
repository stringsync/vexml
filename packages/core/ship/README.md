# core/ship

A project's ship targets, declared as plain objects: what it ships, what
ships first, and the steps one ship takes. Nothing here runs a step:
`target()` and `step()` only return objects, and planning a target only
returns its steps, so importing a target file or showing its plan is safe.
The design is `splates/designs/ship.md`. It replaced the legacy ship library, which is gone.

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

- A **target** has a `name`, the `bump` it takes by default (optional for a
  deployment), the `dependencies` that ship before it, by
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
tag, `commitsSince(ctx, { release: "<package>", paths })` since the newest
`<package>@<version>` tag `npm.release` leaves on the mono commit it built
from, and `commitsSince(ctx, { version: "<package.json>", paths })` since the
last commit that changed that file's `version`, which `npm.release` no longer
bumps here. `ship plan` does not run it, so a plan prints at once; `ship unshipped`
counts every target at once and prints `{ "<name>": <count> }`, leaving out a
target that declares nothing, and one whose count throws (the error goes to
stderr).

A target may declare `current(ctx)`, returning the version it is at now;
`npm.current("<package>")` answers with npm's latest. `ship current` prints
`{ "<name>": "<version>" }` for every target that declares one, leaving out
the rest and any that throw (the error goes to stderr).

## Serving a target

splates never imports a target. The project's CLI hands its targets to
`serve`, which answers four requests, and runs a whole ship for someone at
a terminal when given none:

```ts
// under `bin/mdom ship`
import { serve } from "core/ship";
import { mdom } from "../ship";

await serve(mdom, argv); // or serve([staging, prod], argv)
```

```sh
bin/mdom ship plan --bump minor      # the plan as JSON, as view() returns it
bin/mdom ship unshipped             # { "@stringsync/mdom": 3 }
bin/mdom ship current              # { "@stringsync/mdom": "1.2.0" }
bin/mdom ship versions             # { "prod": [{ "version": "1.2.0", "note": "staging now" }] }
bin/mdom ship done publish           # true or false
bin/mdom ship run publish            # runs one step, writing JSON lines
bin/mdom ship --bump minor           # shows the plan, asks, ships it all here
```

Every request takes `--target <name>`, and all but `unshipped`, `current` and `versions` take
`--version` or `--bump`, and `--upstream <name>=<version>`, once for each target it depends
on. With several targets,
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
- **diff** prepares the deploy's one CloudFormation change set, named
  `core-ship` (`cdk deploy --method=prepare-change-set`, the only synth of
  the deploy), reads it with `describe-change-set`, and asks the user to
  confirm a change that adds or changes an IAM resource, a resource policy,
  a security group or a Lambda permission, or replaces a resource; a No
  fails the step.
- **deploy** executes that change set (`execute-change-set`) and waits for
  the stack to take it up and settle. A change set gone, failed or spent is
  prepared again, asking its risks again. The step is skipped when the change
  set already ran, or had nothing to change, and the stack settled, so a
  resumed ship deploys nothing twice.
- **verify** fails unless the stack settled after its deploy.

A failed deploy follows what it left the stack in to the end, showing each
poll on the step's line, and fails saying which it was: rolled back
(CloudFormation's rollback finished), paused (`--no-rollback`), or a rollback
that failed too, naming each stuck resource and CloudFormation's reason. A
rolled-back or paused stack's ECS services are waited on as the circuit
breaker rolls them back, and the failure says whether each ended healthy.
A stack left in `UPDATE_ROLLBACK_FAILED` refuses every deploy, so the diff
and the deploy, before anything else, ask whether to continue its rollback
(`continue-update-rollback`, skipping no resource) and wait for it; a No, or
a rollback that fails again, fails the step, and a stuck resource is fixed by
hand before the step is retried. The deploy step's timeout is 150 minutes, room for a
deploy and the rollback it waits out. A stack is found by its
CloudFormation name, which the deploy reads once from the app
(`cdk list --long --json`, with the same `context`), so a stack inside a stage
is found by its stage's `stageName` (`prod-App` for `Prod/App`); `stackName`
overrides it.

Optional `context`, `noRollback` and `cheapReplacement` serve a stack deployed
in steps. `context: async (ctx) => ["--context", "digest=..."]` is read when
the stack's name is listed and its change set is prepared, so it can read
live state.
`noRollback: true` executes with `--disable-rollback`, keeping rollback on
when the change replaces a resource, which CloudFormation requires (a stack
an earlier deploy left paused is rolled back first). A replaced resource
whose type is in `cheapReplacement` (default `AWS::ECS::TaskDefinition`)
asks no confirm, a costly one does.

## Publishing to npm

`npm.release({ package, bump, repository, test, keep, omit, pins, fold, scope, prepare, check, mirrorTest, dependencies })` publishes a
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
  only the mirror has (its guide, Dockerfile, workflows); `omit: ["packages/book/**"]`
  leaves out tracked project paths, but never the `mirror/` overlay, and
  `keep: ["skills/x/**"]` carries paths the mirror would leave out, winning
  when `keep` and `omit` both match. `scope: "package"` mirrors the published package's
  folder alone, at the mirror's root (its own manifest the root's, with the
  `core` it reaches under `packages/core`), for a project that keeps the rest
  private; `keep` and `omit` globs and `mirror/` are then relative to that folder. `fold` names private packages of
  other projects to carry in as well, as `fold: { "@mono/rec": { files:
  ["extension/**", "control/index.html"], entries: ["control/main.tsx"] } }`:
  each is copied to `packages/<folder>` in the mirror's workspace and bundled
  into the build, and the build places the `files` its code reads beside
  `import.meta.dir` under `dist/` (a glob keeps its path, a literal path lands
  at its file name) and builds each of the `entries` for the browser beside
  them (`main.tsx` into `main.js`). Nothing changes without `fold`. It installs and builds there, then
  pushes `Release <package> <version>`.
- **prepare** and **check** are optional commands run from the mirror's
  root with the release's version in `SHIP_VERSION`. `prepare` runs after the
  mirror is written and installed and before it is built and committed, so
  what it changes (a stamped version, say) is in the release commit; the
  publish workflow runs it too, before its build, with the version read from
  the package. `check` runs after the build and fails the mirror step before
  anything is committed. `mirrorTest` is a command that tests the composed mirror (`bun test`), run
  from its root after the build and `check`, before anything is committed; a
  failure fails the mirror step. A release naming none runs as before.
- **login** signs in to npm (`npm login --auth-type=web`) only when
  `npm whoami` fails and the workflow has not already published the latest
  version (npm's `_npmUser` is its GitHub Actions bot), so a trusted package
  releases with no sign-in; the login link reaches
  the user as a prompt.
- **first-publish**, only for a package npm has never had, builds and
  publishes from this machine, since npm trusts a workflow only for a
  package it has.
- **trust** runs `npm trust github` when npm does not yet trust the
  workflow (a workflow-published latest version proves it does, since
  `npm trust list` itself needs a one-time password) (it needs npm 11.15 or later and the account's second factor).
- **publish** runs the workflow on the release commit and waits until npm
  has the version, failing when the run fails.
- **tag** creates the GitHub release, tagging `v<version>` with its notes,
  and tags mono's commit the mirror was written from `<package>@<version>`,
  pushed to origin, so `commitsSince`'s `release` marker counts from it.

The login, first-publish and trust steps run npm under a pseudo-terminal
(`script`), since npm starts its web sign-in and one-time-password flow only
for a terminal; the sign-in and second-factor links reach the user as prompts. The build (`bun packages/core/ship/npm/cli.ts
build <folder>`, what the workflow runs) writes `dist/`: JavaScript with
`core` and any private workspace package bundled in, declarations under
`dist/types` pointed at each other rather than at those packages, the files
the manifest's `files` and non-TypeScript exports name, and a manifest
whose dependencies are what the build imports, with their `@types/`.

## Versioned deployments

A deployment can opt into artifact versions independently of publishing:

```ts
const staging = target({
 name: "staging",
 version: { current: "1.4.2" },
 bump: "patch",
 plan: ({ version }) => [
  step({
   id: "deploy",
   does: `Deploy ${version}`,
   run: async (ctx) => {
    if (version === undefined) throw new Error("Select a version");
    await deployArtifact(ctx, version);
   },
  }),
  step({
   id: "verify",
   does: `Verify ${version}`,
   dependencies: ["deploy"],
   run: async (ctx) => {
    if (version === undefined) throw new Error("Select a version");
    await verifyArtifact(ctx, version);
    ctx.released(version);
   },
  }),
 ],
});
```

`version: {}` accepts explicit artifact identifiers only; supplying `current`
also enables bumps from that stable semantic version. `bump` remains an
optional default. Current is declared data (for example from a deployment
ledger), never a live lookup performed by planning. An explicit version is
opaque, so an image digest or release tag works as well as `1.4.2`.

`ship plan --bump minor` resolves `1.5.0` before review. The returned plan has
`versioned: true` and `version: "1.5.0"`, with no remaining bump. The caller
must persist that exact version with the ship and pass `--version 1.5.0` to
all `done` and `run` requests and retries, even if current has since changed.
A bare plan may advertise an explicit-only target without a selected version;
execution requires one. The terminal runner freezes the reviewed version too.

`--version` overrides the default bump; combining explicit `--version` and
`--bump` is an error. Versions must be nonempty with no surrounding whitespace.
Targets without `version` retain their existing behavior and reject explicit
versions. Existing publishing targets still allocate their versions as before.

Selecting an existing version means the target's steps fetch that artifact;
a bump means its steps build and deploy the resolved new version. The target
owns those operations and idempotency checks. Only successful verification
should call `ctx.released(version)`, including verification in `done` when
resuming an already successful deployment. No release is reported automatically.
Ships UI support and adoption by individual deployments are separate changes.

### Following an upstream, and the versions a target may ship

A deployment promoted from an earlier stage names that stage with
`version: { follows: "staging" }`, which must be one of its `dependencies`.
Shipped together with no version picked, it takes the version the stage
releases in this ship, read from `upstream` as any dependent does; `view`
reports `follows`, so a review screen can offer "Follow staging". It can
still ship alone with an explicit `--version`.

`versions(ctx)` lists the versions a target may ship, newest first, each with
an optional short `note` (`"staging now"`, a date). `ship versions` prints
them, keyed by target name, for a version picker in place of a free-text
field. Like `current`, it is a lookup the Ships page runs apart from the
plan; the target's own steps still refuse a version it cannot ship.
