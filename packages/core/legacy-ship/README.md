> **Legacy and frozen.** This is the legacy ship library, kept only until it is removed. New work must not import it. `core/ship` still resolves here for existing consumers.

# core/legacy-ship

Reusable deployment steps for any target: an npm package, an AWS stack, a
container image, a commit. Declare what your repository ships and carry it all
out together. Shipping here means putting something in the world, not only
publishing a versioned npm release. It is a library, not a CLI: the same
declaration backs a terminal command, an MCP tool and an HTTP endpoint, because
deciding what to ship is separate from doing it.

```ts
import { releases } from "core/legacy-ship";

await releases.lockstep(
	releases.npm("@scope/foo"),
	releases.npm("@scope/bar"),
	releases.git(),
	releases.github(),
).release({ bump: "minor" });
```

A deploy reads the same, with a stack or your own artifact in place of the
packages:

```ts
await releases.lockstep(
	awsStack("net-stack", { stacks: [staging, prod] }),
	releases.git(),
).release();
```

That is a whole release script. `releases` composes `Release` objects, and
`release()` runs one: print what would go out, ask, stamp every package,
commit, and carry each artifact out. `bump` says how far the version moves, and
`patch` is the default.

## Declaration order does not matter

Every artifact carries a stage: a `stamp` goes into the release commit, packages
`publish`, then (for a registry that stages) wait in `approve` until
each is live, then the `tag` goes on, then the `notes` are written about it. A
release runs its artifacts by stage, so this declaration goes out in exactly the
same order as the one above:

```ts
await releases.lockstep(
	releases.github(),
	releases.git(),
	releases.npm("@scope/foo"),
	releases.npm("@scope/bar"),
).release();
```

The point is what the ordering protects: a tag for a version no registry ever
received is a permanent lie, so the tag always follows the packages it names,
as a property of the artifacts rather than a rule about how to write them down.

## Files that say which version they came from

An agent skill carries its version in its own frontmatter, because a copy
somebody installed months ago has nothing else to give its age away.
`releases.skill` keeps that number honest:

```ts
await releases.lockstep(
	releases.npm("@scope/cli"),
	releases.skill("skills/arbor/SKILL.md"),
	releases.git(),
).release();
```

The path is relative to the workspace root, and the `version:` line in the
document's frontmatter comes out holding the version going out. A skill with no
such line stops the release, since a version nobody wrote down is one nobody can
compare.

It is the `stamp` stage that makes the number true rather than one release
behind: the rewrite happens between stamping the packages and committing them,
so the document goes into the release commit alongside every `package.json`, and
a package that bundles it bundles the version that bundled it.

## The RELEASE file

The moment a release starts, a `RELEASE` file goes down at the workspace
root: the version going out, and which artifacts have landed so far. The last
artifact to land deletes it.

So a `RELEASE` file on disk means the previous run died, and the next
`release()` finishes that version instead of bumping past it. Every artifact the
file says landed is skipped outright, and the rest carry their own checks
(`releases.npm` asks the registry, `releases.git()` leaves an existing tag
alone), so running `release()` again after any failure is always the right
move: nothing goes out twice, and whatever failed is retried. A run that died
between stamping the versions and committing them left a dirty tree, and
preflight puts its stamps back by itself: while `RELEASE` says a release is
under way, changes that touch only `version` lines are restored, and the version
comes back off `RELEASE` as it would have. Any other change in the tree still
stops the release, naming the files that are not stamps.

A release with a `project` (a repository holding many) keeps its file as
`RELEASE.<project>`, so one project's release that died is never finished by
another's: vexml's dead 1.13.3 cannot become splates's version. A bare `RELEASE`
beside a project's release is whose it is nobody can say, so that release stops
and names it; finish what it tracked, or delete it.

The file is in-flight state for one checkout, not history, so put it in your
`.gitignore`:

```gitignore
# a release under way; the last artifact to land deletes it
RELEASE
RELEASE.*
```

Committing it would hand every other checkout a release that is not theirs to
finish. Getting into a weird state is cheap in both directions, because the per-artifact
checks hold either way. A stale file resumes a release that actually
finished, and every artifact skips; a lost file bumps past a death, and you spend
a version number.

## Anywhere npm is not the answer

Nothing here is tied to a package manager. A deploy target is an `Artifact`
(see What an artifact is), whose `publish` pushes an image, deploys a stack or
rolls out a commit. For a place that takes versions like a package registry,
`releases.custom` takes any `Registry`:

```ts
import { type Registry, releases } from "core/legacy-ship";

class CrateRegistry implements Registry {
	async published(name: string, version: string) {
		return false;
	}
	async deployed(name: string) {
		return undefined; // the version installs get now, once there is one
	}
	async publish(dir: string) {
		// log in if that is what publishing here takes, then publish or throw
	}
}

await releases.lockstep(
	releases.npm("@scope/foo"),
	releases.custom("scope-foo-sys", new CrateRegistry()),
	releases.git(),
).release();
```

A registry answers three questions: do you already have this version, which
version do installs get now, and please publish this directory. Implement those
and it composes with everything else.

## An AWS stack

`awsStack`, from `core/legacy-ship/aws`, deploys CDK stacks as one ship step, one
stage per stack, so a ship is a deployment and not an npm publish. The stacks
belong to a workspace package, whose version is the live version, and the
release is resumable.

```ts
import { releases } from "core/legacy-ship";
import { awsStack } from "core/legacy-ship/aws";

const app = new App();
const staging = new NetStack(app, "Net-staging");
const prod = new NetStack(app, "Net-prod");

await releases.lockstep(
	awsStack("net-stack", { stacks: [staging, prod] }),
	releases.git(),
).release();
```

Pass the `cdk.Stack`s in the order they deploy; do not call `app.synth()`
first. They deploy through AWS CDK's own toolkit
(`@aws-cdk/toolkit-lib`, an optional peer along with `aws-cdk-lib`) and stop
at the first failure, so `prod` never deploys after `staging` fails. Each stack
gets a `ReleaseVersion` output carrying the version, which lands with the
stack or not at all; a rerun skips the stacks that already carry the version
and deploys the rest. The last stack's output is the live version, read with
the `aws` CLI. `--dry-run` only synthesizes.

For a workspace whose packages all go to npm, `releases.workspace()` reads the
roster off your manifest instead:

```ts
await (await releases.workspace()).release({ bump: "minor" });
```

## What an artifact is

Two members and an optional stage, whether it publishes one package or a
hundred:

```ts
interface Artifact {
	readonly packages: readonly string[];
	readonly stage?: Stage; // "publish" when omitted
	publish(cut: Cut): Promise<void>;
}
```

`packages` is the declaration a release cross-checks against your manifest,
and `publish` carries the artifact out. A `Cut` is the release under way:
`version`, `tag`, `root` for the workspace, `dir(name)` for a package's
directory, and a `log`. By the time an artifact sees one, every package is
stamped; everything past the `stamp` stage sees that stamp committed too.

An artifact is not only a package: `publish` may deploy a stack, push an image
or release a commit. Versioned releases key reruns on `cut.version`. For a deployment without a
version, use `deploy()` below. A versioned artifact drops into a `lockstep`
beside the ones here:

```ts
class DockerArtifact implements Artifact {
	readonly packages = []; // nothing the manifest carries

	async publish(cut: Cut) {
		await push(`app:${cut.version}`);
	}
}
```

Make `publish` repeatable: a retried release runs it again, so skip whatever
already went out.

## A dry run

`release({ dryRun: true })` rehearses a ship without sending anything out,
and asks nothing. Each artifact says what it does in a dry run; for the npm
ones:

- preflight, stamp and build run as they would, a branch other than the
  default only noted;
- each package is packed (`npm pack`) rather than published, and the packs
  are installed into a project outside the workspace, where every export that
  names a script is imported with Node, or with Bun when a package names it
  among its `engines`;
- a mirror pushes to a bare copy of its remote, so its guard meets the real
  history;
- the push, the tag and the notes say what they would do;
- the stamp is undone, and no RELEASE file is kept.

A step or artifact says what it does in a dry run with `dryRun(cut)`; a stack
only synthesizes. One
without it runs as usual at the preflight, stamp and build stages, and is
skipped from the publish stage on, so a custom artifact never sends anything
out by accident. Give a `DryRun` (`{ dir }`) in place of `true` to keep what
it made, or to rehearse several releases one after another: the later ones
install beside the earlier ones' packs.

A project's ship command must honor a dry run too: the Ships page's Rehearse
runs it with `--dry-run` and `SPLATES_SHIP_DRY_RUN=1` set, and cannot tell
whether the command ignores them. Treat either as `dryRun: true`, rehearse
without deploying or publishing anything, and exit zero when the rehearsal
passes.

## Building from the mirror

A project with a public repository of its own can publish what that
repository builds, not what the workspace does:

```ts
await releases.lockstep(
	releases.mirrored({ project: "vexml", remote, tag: true }),
	releases.npm("@scope/vexml"),
	releases.github({ repo: "scope/vexml" }),
).release({ project: "vexml" });
```

At the build stage it writes the mirror's commit to a checkout of the remote,
runs `bun install` there and builds each public package of the project in it,
folding in the mirror's copy of `core`; those builds are what go out. A package
another project publishes is installed from the registry at its release, so a
change it has not released yet fails the build rather than the people who
install the package. The tag stage pushes that same commit and its tag. Use
it in place of `build`, `vendor` and `mirror`.

The build stage shows as release steps of its own, each with its deadline, so
the Ships page times each and a failure names the one that failed: install the
mirror (5 minutes), build its packages (10) and, with `test`, test it (15). A
dry run rehearses all of them.

Give it `test`, a command such as `bin/splates test`, to run in the mirror
once the packages are built. A file the build leaves out of the mirror then
fails the release here, not after it is published. A non-zero exit fails the
test step. Without `test`, there is no test step and nothing is run.

The mirror commit carries the `bun.lock` its install wrote. To publish from
GitHub Actions in the public repository, rather than from this machine, give
it the command the workflow runs there and the same `githubActions` each
package publishes through, made with the mirror's repository:

```ts
const via = githubActions({ repo: "scope/vexml" });
await releases.lockstep(
	releases.mirrored({ ...MIRROR, publish: "bin/vex publish", via }),
	releases.npm("@scope/vexml", { via }),
	releases.github({ repo: "scope/vexml" }),
).release({ project: "vexml" });
```

The mirror commit then carries the publish workflow too, and its branch is
pushed when the `Publish` step starts the run on it; the tag still waits
until npm serves the version. The command is the project's own, run from the
mirror's root, and calls `Release.publish()` on a declaration that builds with
`vendor`, since in the mirror `core` is a private workspace package.

## The contract

Every ship's plan, status, step events and answers are described once, as zod
schemas and types, in `core/legacy-ship/contract` (`SHIP_PLAN`, `SHIP_STATUS`,
`STEP_EVENT`, `SHIP_ANSWER`). Release, Deploy and `ShipCommand` emit through
it, so a viewer reads any ship without knowing its kind. `schema` is `1` and
grows only by adding fields, so parse with the schemas and keep unknown fields.

## Adopting upstream versions

A project that depends on another project's published package moves its pins as
part of its own release. `releases.adopt({ project, upstream })` is a preflight
step, so it runs before the stamp: `upstream` is the `ADOPT_INPUT` value, the
versions to adopt as `name@version` entries separated by commas, which a caller
passes with `--input adopt=...`.

```ts
const command = new ShipCommand({
	inputs: { adopt: ADOPT_INPUT },
	declare: ({ adopt }) =>
		releases.lockstep(
			releases.adopt({ project: "vexml", upstream: adopt }),
			releases.npm("vexml"),
		),
});
```

It keeps each pin's range mark, leaves `workspace:` pins alone, and reports
`skipped` when the pins already match. It never commits: the release commit
carries the moved manifests, and the lockfile is refreshed by the project's own
preflight. A pin it cannot simply move (a `catalog:` entry, an alias, a tag)
is sent as an `adopt` event with a `questionId`, the versions and the pins it
left; the release waits for an answer to that `questionId` in the answers file,
as for any question, then checks the pins match. The caller answers `true`
once a task landed the change in the tree, and `false` to stop the release.

## The plan

`plan()` lists what `release()` would run, in order, and runs none of it. It
reads the workspace and a RELEASE file, never writes, and touches neither git
nor the network. `wiz dev ship plan` prints it as a list, and `--json` as one
document for a program to read:

```json
{
	"schema": 1,
	"version": "1.2.4",
	"resuming": false,
	"steps": [
		{
			"id": "step:@scope/one:Publish @scope/one",
			"name": "Publish @scope/one",
			"stage": "publish",
			"packages": ["@scope/one"],
			"artifact": "@scope/one",
			"deadlineMs": 300000
		}
	]
}
```

`schema` is the shape's version and grows only by adding fields. Each `id` is
the one the step's run-time events carry (`SPLATES_SHIP_EVENTS`), so live
progress matches the plan by `id`. `stage` is `preflight`, `stamp`, `build`,
`publish`, `approve`, `tag` or `notes`; `artifact` is present only for a step an artifact
declared.

## The events file

The lines are `STEP_EVENT` in `core/legacy-ship/contract`.

When `SPLATES_SHIP_EVENTS` names a file,
`release()` appends one JSON object per line to it: first a `declared` line
for every step in order, then the run-time lines as they happen. Every line
carries `schema` (now `1`, growing only by adding fields), `type`, the step's
`id` (the plan's `id`), `name`, and `at`, an ISO timestamp. Unset or empty, no
file is written.

| `type`     | Extra fields                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `declared` | `stage` (as in the plan), `packages` (string array), `artifact` (when declared by one), `deadlineMs` |
| `ask` | `questionId` (unique to this question), `question` |
| `answered` | `questionId`, `answer` (boolean) |
| `started`  | none                                                                                           |
| `staged`   | `package`, `version`, `stageId` (what `npm stage approve` takes) and `url`, the npm page to approve it on |
| `check`    | `passed` (boolean), one per poll of a step's check; a failed one may add `status` and `url` (see What is live) |
| `done`     | none                                                                                           |
| `skipped`  | none: a resumed release found the step already landed                                          |
| `failed`   | `error`, the message; the release stops after it                                               |

`declared` matches the plan's step by `id`, with the same `stage`, `packages`
and `artifact`.

### Answering questions

Each line is a `SHIP_ANSWER` in `core/legacy-ship/contract`.

Set `SPLATES_SHIP_ANSWERS` alongside `SPLATES_SHIP_EVENTS` to a per-run
answer file. The caller appends newline-terminated JSON objects:
`{"questionId":"<id from ask>","answer":true}` (or `false`). Only a boolean
answer matching the pending question is accepted; stale IDs are ignored and
an unfinished final line waits for its newline. Malformed completed JSON fails
the run. The release polls every 100ms, emits `answered` once it accepts an
answer, and never modifies the answer file. Use separate files for concurrent
runs. There is no automatic yes or timeout in this mode, including with the
legacy `yes` option. Without an answer channel, terminal prompting is unchanged.

A question may ask for text instead of a yes or no: its `ask` event carries
`"input":"text"`, and the answer line adds `"text":"<what was typed>"` beside
`"answer":true`. npm publishes use two such questions. When npm has nobody
logged in, the publish step asks with the sign-in page (`link`, no `code`) and
continues by itself once `npm login` completes. When npm asks for a one-time
code (`EOTP`), it asks for it as a text answer and retries with `--otp`.

A Deploy step's `confirm` is asked the same way, under its plan id.

The release start question uses step id `release` and name `Release`;
step questions use their plan IDs. A no at a step leaves RELEASE resumable.
`ShipCommand run --yes` (or `ReleaseOptions.approved`) records prior approval
of starting the release and skips that question only. Step questions still
require answers. A direct terminal caller's legacy `ReleaseOptions.yes` still
skips all terminal prompts.

## What is live

A release that publishes straight to a registry is done once the registry
accepts each package: npm scans every publish for malware before it serves it,
typically for about five minutes and fifteen at its busiest, and may hold a
version for a person at npm to review, so `npm view` can say a version does not
exist for a while after its publish succeeded. The release does not wait on
that, and tags once every package is accepted. A rerun of a release whose
publish npm took (its 409) counts the version accepted and publishes nothing.

A registry that stages (`Registry.staged`) holds each version until a person
approves it, so its packages get a `Live` step in the `approve` stage after
every package went out. It polls the registry, backing off from 10 seconds to
every 2 minutes, and never gives up. Each failed poll's `check` event carries
`status`: `pending` at first, then `held` once 20 minutes have gone by, and
`url`, the version's page. The tag goes on once every staged package is live.

`releases.npm` runs `npm stage publish` (npm CLI 11.15+, so a stage-only
`NPM_TOKEN` works), which holds each version until a person approves it on
npmjs.com or with `npm stage approve <stage-id>`. Its `Stage` step per package
reports a `staged` event, and every package stages before any `Live` wait, so
a person approves them in one sitting; the scan follows each approval. A
brand-new package cannot be staged: publish its first version by hand.

`status()` reads back what is live. Every artifact that can say what it has live answers `deployed()`, and `status()` asks them
all beside the workspace's own version, so a caller can show what lags:

```ts
const { version, artifacts } = await release.status();
for (const { name, deployed } of artifacts) {
	console.log(name, deployed === version ? "live" : `at ${deployed ?? "nothing"}`);
}
```

`releases.npm` answers with the `latest` dist-tag, the version installs get;
`releases.git()` with the newest `v*` tag on origin; `releases.github()` with
the release GitHub marks latest. `undefined` means nothing is out yet.
Artifacts with nowhere to ask, a build or a skill stamp, leave `deployed` off
and `status()` skips them. `wiz dev ship status` in this repository prints it,
and is the example to copy for a project's own command.

A custom artifact answers from wherever it publishes to. A web service can
serve the version it was built at and have `deployed()` fetch it back:

```ts
class ServiceArtifact implements Artifact {
	readonly name = "api";
	readonly packages = [];

	async publish(cut: Cut) {
		// deploy with DockerImage's env.variables holding { APP_VERSION: cut.version },
		// which the service's /version route returns
	}

	async deployed() {
		const res = await fetch("https://api.example.com/version");
		return res.ok ? (await res.text()).trim() : undefined;
	}
}
```

`name` is what `status()` calls the artifact; without one it goes by its
packages, or its stage when it has none.

## What `release()` will not do

It will not release from anywhere but the default branch, because switching
for you would release code you were not looking at. And it will not release a
declaration that has drifted from the manifest, saying every disagreement at
once: name a package that no longer exists, or add a public package and
forget to declare it, and you hear about it before anything is stamped. That
is what makes a declaration safe to write by hand.

It will not release a dirty tree either. The release commit takes every
tracked change with it, so a dirty tree is a release nobody read: commit what
belongs in it or discard the rest, and what goes out is exactly the version
stamps on top of the commit you were looking at.

Each `release()` asks before any of it. Pass a `prompt` to ask somewhere
other than a terminal, a `log` to say it somewhere else, and a `workspace` or
`git` to point it at a repository that is not the one around the working
directory.

## Publishing from GitHub Actions

`release.publish()` is the half of a release a CI job can do. It runs only the
build and publish stages at the version the checkout already stands at, with
each registry in its trusted mode (`Registry.trusted()`): for npm a plain
`npm publish`, which npm authorizes from the job's OIDC identity, with no
token, no login and no stage. It publishes each package the registry lacks and
nothing else: no stamp, tag, approval or notes, and a rerun publishes nothing.

`releases.publishWorkflow({ command })` keeps the workflow that calls it
current. The file lives at `.github/workflows/publish.yml` (npm's
trusted publisher entry names it, so the path is fixed), is generated, and
holds no package list: it checks out the commit it is dispatched with and runs
`command`. A release writes it into the release commit when it is missing or
stale; commit it like a lockfile. `PublishWorkflow.check(root)` throws on
drift. mdom's command, for one, is `bin/mdom publish`.

### Starting that workflow from a release

`releases.npm("@scope/foo", { via: githubActions() })` publishes through the
workflow instead of from this machine, so nothing stages and nobody approves.
Its `Publish` step pushes the release commit, starts the workflow on it
(`gh workflow run`, with the commit as the `ref` input), and follows the run
through the step's `check` events: `status` is the run's (`queued`,
`in_progress`), `url` its page. It looks every five seconds rather than
backing off, and logs each change in the run once, with its page, then how
long the run took. A run that ends any other way than success fails the step
with the end of its log.

npm checks a package from the workflow against the provenance the run signs,
and refuses one whose `package.json` `repository.url` does not name the
workflow's repository. So the release's preflight refuses such a package
first, before it stamps a version, saying what to set. `releases.workspace({ via })` does the
same for every public package, and this workspace's ship uses it.

One run publishes every package, found again by its commit: later packages
reuse it, a resumed release reuses a run still going or finished, and reruns
one that failed (`gh run rerun --failed`). The release is done once the run
succeeds and npm has accepted the version, which may not be installable yet.

Each package needs a trusted publisher entry on npm once. `release.trust()`
makes them: for each package it runs `npm trust github`, naming the
repository and the workflow file. npm asks you to authenticate in a browser;
choose to skip two-factor authentication for the next 5 minutes there, and
the other packages go through without asking. A project's own CLI runs it,
such as `bin/mdom trust`. When npm refuses a run for want of an entry, the
failure names that command, when `githubActions({ trustCommand })` sets one,
and the `npm trust github` line for that package alone. The package must exist
already, and a new entry lapses after about two days unless a publish uses it.

## Logging in is part of publishing

Nothing asks you to be logged in beforehand. An artifact that needs credentials
gets them where it needs them: `releases.npm` runs `npm login` when
`npm whoami` comes back with nobody, and `releases.github()` runs
`gh auth login` the same way. Publishing then carries on. There is no
preflight to keep in step with what publishing actually does.

Set `NPM_TOKEN` and `GH_TOKEN` and neither login ever runs. In CI, set them:
`npm login` reads from a human, and where there is none it would sit waiting
rather than failing, so a release under `CI` says which token to set instead
of asking.

Anything else that goes wrong throws, because there is nothing to decide
about a publish that failed halfway. The `RELEASE` file it leaves behind is
what makes the next `release()` finish the job.

## What it leaves to you

Quality gates. Nothing here runs your formatter, tests or build, because which
ones matter is your repo's business, not this package's. Run them before you
call `release()`.

## Ship command contract (schema 1)

A project's terminal command can hand its declaration to `ShipCommand`:

```ts
import { ShipCommand, releases } from "core/legacy-ship";

await new ShipCommand(
  releases.lockstep(releases.npm("@scope/foo"), releases.git()),
  { release: { project: "foo", bump: "patch" } },
).run();
```

The wrapper reads argv from `core/system`'s `Ps` unless `run(argv)` supplies
it. Errors reject; the entry point owns error reporting and exit status.
`plan` and `status` print one JSON object followed by a newline (with or
without `--json`). They never run release steps. Commands are:

- `plan --json`: `{ schema: 1, identity: { kind: "version", from, to },
  resuming, inputs, steps }`. `from` is the workspace version; `to` is the
  planned version, including any unfinished RELEASE. Steps retain the release
  plan's ids, names, stages, packages, artifact names and `deadlineMs`.
- `status --json`: `{ identity: { kind: "version", from, to }, artifacts }`.
  Both identity values are the current workspace version. Each artifact has
  `{ name, deployed }`; missing deployments are `null`. Only artifacts that
  can report deployment appear.
- `[run] [--input name=value ...] [--dry-run]`: run the release, or rehearse
  it using the release's existing dry-run behavior.

Schema 1 grows only by adding fields. Identity reserves `kind: "commit"`
for commit-keyed targets; this wrapper currently handles `Release` only.

Every plan advertises `inputs: [{ name, type, options?, default, label }]`.
The built-in `bump` choice accepts `patch`, `minor`, or `major`, defaulting to
`release.bump` or `patch`. Additional inputs are declared with `inputs`:

```ts
await new ShipCommand(
  (values) => {
    // values.preview is boolean; values.region is "east" | "west".
    return declarationFor(values.region, values.preview);
  },
  { inputs: {
    preview: { type: "boolean", default: false, label: "Preview" },
    region: { type: "choice", options: ["east", "west"], default: "east", label: "Region" },
  } as const },
).run();
```

String inputs use `{ type: "string", default: "...", label: "..." }`.
A declaration factory receives validated inputs for all three operations;
it must construct the declaration without publishing or other side effects.
`bump` is reserved. Unknown names and invalid values are refused before the
factory runs. Defaults are validated too.

Input precedence is CLI, then `SPLATES_SHIP_INPUTS` (a JSON object of named
values), then the legacy `SPLATES_SHIP_BUMP` for bump alone, then declared
defaults. JSON booleans must be actual booleans; CLI booleans must be `true`
or `false`. Repeated CLI names take their last value. String values may
contain `=`. Inputs affect plan, status and run alike. No input implicitly
skips the release's confirmation. `release` options preserve existing
confirmation, force and dependency injection behavior. `output.write(text)`
can replace stdout for embedding or tests.


## Commit deployments

`deploy(name, steps, artifacts?, paths?)` declares work in caller order without a
package roster, version bump, stamp commit, tag or push. Each step is a
`Step<DeployContext>`: its context contains `commit`, `root`, `log` and
`dryRun`, with no release version.

```ts
import { deploy, ShipCommand } from "core/legacy-ship";
import { Duration } from "core/time";

const staging = deploy("net-staging", [{
	name: "Deploy service",
	deadline: Duration.mins(10),
	async run(context) {
		// Build and deploy this commit; stamp context.commit into the artifact.
	},
	async dryRun(context) {
		context.log.info("would deploy service");
	},
}]);
await new ShipCommand(staging).run();
```

The optional fourth argument declares literal repository-relative source files or
directories, for example `deploy("service", steps, artifacts, ["service", "analyzer"])`.
Paths need no package manifest. Use forward slashes with no trailing slash;
absolute paths, traversal, empty segments, glob syntax and git pathspec magic
are rejected. Duplicates are removed in declaration order. Include every source
boundary affecting the target, including shared sources where appropriate.
Paths are metadata only: they neither select steps nor change deployment behavior.

Deploy plans expose these boundaries as top-level `paths: string[]`.
An empty array means no source boundary was declared, never the entire repository.
Consumers should count commits affecting these literal files or directories;
they must not infer ownership from target names or the empty step package lists.
The field is additive in schema 1; consumers of older plans should treat a
missing field as undeclared.

`plan --json` reports `identity: { kind: "commit", commit }`, resume state
and step ids; `status --json` reports the same identity and live commits
from the optional artifacts' `deployed()` methods. Resume state is never
treated as evidence of what is live.

`await staging.deploy(options)` refuses a dirty checkout, but permits any
branch and does not check whether it has been pushed. A step may impose
additional requirements. Completed steps are saved in Git's private directory,
keyed by target name and full commit, and skipped after a failed run. A new
commit starts afresh. The state is removed after success, so another successful
run deploys again. Steps should tolerate interruption between external work
and saving their completion.

Options inject Git, filesystem, process, logger, timer and clock for tests;
`root` defaults to the working directory and `stateDir` may override Git's
private directory. `confirm` asks before a step; `yes` bypasses it at the
terminal, but with an answer channel (`SPLATES_SHIP_ANSWERS`) the question is an
`ask` event answered from the Ships page, still asked under `--yes`, and a no
stops the deployment resumably. `awsStack.steps` takes `confirm` by stack name. Dry runs
invoke only explicit step `dryRun` methods, skip checks and prompts, and
leave resume state untouched. Steps without a rehearsal only log what would
run. Deployment steps emit the same declared, started, checked, done, failed
and skipped events as releases.

For CDK stacks, `awsStack.steps(options)` from `core/legacy-ship/aws` returns one
step per stack, in caller order. Each step is also a `DeployArtifact`:

```ts
import { deploy, ShipCommand } from "core/legacy-ship";
import { awsStack } from "core/legacy-ship/aws";

const stacks = awsStack.steps({ stacks: [staging, prod], rollback: false });
await new ShipCommand(deploy("service", stacks, stacks)).run();
```

Each stack carries the full commit as its `DeployCommit` output. `deployed()`
reads that output; a step skips deploying when it already matches. A dry run
only synthesizes, without reading live stamps or writing deployments. Pass
stacks before synthesizing their app. Access profiles and regions work as in
`awsStack(name, options)`, which remains the versioned release API and keeps
its `ReleaseVersion` output. Rollback defaults to true for both forms.
