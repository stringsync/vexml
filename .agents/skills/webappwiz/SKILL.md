---
name: webappwiz
description: "Check whether the webappwiz package already covers a piece of infrastructure before writing it by hand or adding a dependency for it. Read this before writing any of: time, clocks, durations or timers; logging; id generation; HTTP serving; CLI argument parsing; background tasks or queues; web workers; markdown parsing; typed event emitters; 2D geometry or spatial indexes; filesystem, env or process access; typed RPC over fetch; schema validation; AbortSignal plumbing; disposable resources; browser scroll, animation frames or visibility. Also use when asked to update or upgrade webappwiz in a project, and whenever the user says webappwiz."
version: 0.0.14
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
the new version dropped what this project was using, that is a gap: leave the
local code working, and hand it over with the block above. Do not vendor,
fork, or patch `node_modules` to get the build green.

## Rules

- Never edit the webappwiz repository from this project's thread.
- Never copy its source into this project.
- Reading the table is the whole check, and it is cheap. Do it before adding a
  dependency, not after.
