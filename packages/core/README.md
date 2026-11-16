# core

The parts of a web app that get written again every time, behind interfaces a
test can replace. One package, one subpath per module.

Declared as `"core": "workspace:*"`; it is not published.

```ts
import { Duration } from "core/time";
import { NodeFs } from "core/system";
```

There is no `core` entry point, only the subpaths below. A barrel over all
of them would make `import "core"` load every module, including the ones
that only run in a browser or only on a server, and it would become the default
for anything that resolves the package by name. Importing what you mean keeps
the rest unread.

| Subpath | |
| --- | --- |
| [`core/aws`](./aws) | CDK constructs for running a web app on AWS: network, database, image, service and domain. Needs `aws-cdk-lib` and `constructs` |
| [`core/abort`](./abort) | Ways of bringing an `AbortSignal` to bear on work that does not take one |
| [`core/assert`](./assert) | The invariants a type cannot state, checked at runtime |
| [`core/browser`](./browser) | The browser platform behind interfaces: scrolling, animation frames, device and visibility |
| [`core/cmd`](./cmd) | Builds a CLI: subcommands, typed positional arguments and flag options |
| [`core/creds`](./creds) | API keys and tokens, read from the environment, a `.env` file or the operating system's secret store, as the caller lists |
| [`core/dictate`](./dictate) | Dictation: the browser's mic as PCM16, streamed to a server that transcribes it live |
| [`core/disposable`](./disposable) | Resources that must be released, and stacks that release them in reverse order |
| [`core/events`](./events) | Typed event dispatch, with a read-only view to hand to whoever listens |
| [`core/geometry`](./geometry) | The 2D value types a web app keeps rewriting: `Rect`, `Position` and a `QuadTree` |
| [`core/id`](./id) | A source of identifiers behind an interface, so tests can make them predictable |
| [`core/log`](./log) | Logging behind a `Logger` interface, with decorators and an in-memory double |
| [`core/md`](./md) | A markdown document as a data source: frontmatter fields, sections and code blocks |
| [`core/legacy-ship`](./legacy-ship) | Legacy and frozen: deployment steps for any target, shipped together. New ships use `core/ship` |
| [`core/ship`](./ship) | Ship targets and their steps declared as plain objects, a plan turned into data for a review screen, and `serve`, which answers plan, done and run from a project's CLI |
| [`core/skills`](./skills) | The agent skills a project installs from a repository's release tags, through the `skills` CLI |
| [`core/system`](./system) | Interfaces for the things that touch the machine, so code under test doesn't |
| [`core/task`](./task) | Somewhere to say "this needs doing again" without saying when |
| [`core/time`](./time) | Time as a seam: `Duration`, `Clock` and `Timer`, with fakes for each |
| [`core/worker`](./worker) | Work sent somewhere else and answered, behind an interface |

## Where a subpath runs

Most of these run anywhere. The ones that do not are kept off their module's
main entry point, so importing a task queue on a server does not reach for
`requestAnimationFrame`:

- Needs a browser: `core/browser`, `core/dictate/browser`,
  `core/task/browser`, `core/worker/web`
- Needs a server: `core/cmd`, `core/dictate/server`,
  `core/legacy-ship`, `core/ship`, `core/skills`, `core/system`

`platform.test.ts` holds that line, failing if an entry point that runs
anywhere starts reaching one that does not.

The fakes live beside what they replace, under `/testing`:
`core/dictate/testing`, `core/time/testing`,
`core/system/testing`, `core/legacy-ship/testing`,
`core/worker/testing`.

## Optional peers

Everything above has no dependencies to speak of. Two subpaths bring one,
named as optional peers, so a program that never imports them never installs
or bundles them:

- [`core/react`](./react): `react`, `react-dom`
- [`core/aws`](./aws): `aws-cdk-lib`, `constructs`

`platform.test.ts` fails when any other subpath reaches them.
