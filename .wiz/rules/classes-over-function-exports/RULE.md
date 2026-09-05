---
name: classes-over-function-exports
description: A file's dependency-taking functions become one class that takes them once.
files: "**/*.ts"
level: error
complexity: high
recommended: true
version: 0.0.14
---
# Classes over function exports

A file should not export several functions that each take their dependencies
as parameters: injecting those dependencies in tests is awkward, and the
dependency list repeats at every call site. Group that behavior into a class
that receives its dependencies once, through its constructor.

Take an interface when the dependency has more than one implementation, or a
second one is coming: a fake for tests counts. A dependency with one
implementation and no second in sight is injected as the class it is, since an
interface with a single implementation is a file to keep in step and nothing
else.

There is no prescriptive mapping from functions to classes: one class may
absorb several related functions. A file exporting a single function is
acceptable, and pure helpers that take no dependencies may share a file
freely; the rule targets dependency-taking functions.

A cli action goes the other way, and is a function. It runs once, with its
options handed to it by the parser, and nothing else ever calls it, so a class
there is built at the call site, has one method called on it, and is dropped.
Give each action a file named for the command, `fix.ts` with `fix.test.ts`
beside it, and let its dependencies ride in the same options object the parsed
options arrive in, each one optional with the real one defaulted inside. That
is what a test needs to call the action with fakes, which is the only reason
to inject them.

## Good

```ts
interface Clock {
	now(): Date;
}

export class Stamper {
	constructor(private clock: Clock) {}

	stamp(message: string): string {
		return `${this.clock.now().toISOString()} ${message}`;
	}
}
```

A dependency with one implementation is injected as itself:

```ts
export class Report {
	constructor(private writer: MarkdownWriter) {}
}
```

Pure, dependency-free helpers are fine alongside it:

```ts
export const trimmed = (message: string): string => message.trim();
```

One function taking a dependency is fine on its own: the rule is about a file
full of them.

```ts
export function stamp(message: string, now: () => Date): string {
	return `${now().toISOString()} ${message}`;
}
```

A cli action is a function, and takes its dependencies where its options are:

```ts
// fix.ts, the action behind `wiz dev fix`, with fix.test.ts beside it
export interface FixOptions {
	/** Report problems without writing fixes, as CI wants it. */
	check: boolean;
	log?: Logger;
	ps?: Ps;
}

export async function fix(opts: FixOptions): Promise<void> {
	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();
	// ...
}
```

## Bad

```ts
export function stamp(message: string, clock: Clock): string {
	return `${clock.now().toISOString()} ${message}`;
}

export function stampAll(messages: string[], clock: Clock): string[] {
	return messages.map((m) => stamp(m, clock));
}
```

A cli action wrapped in a class, which the command declaration constructs only
to call once:

```ts
export class Fix {
	constructor(opts: FixOptions = {}) {
		/* ... */
	}

	async run(opts: { check: boolean }): Promise<void> {
		/* ... */
	}
}

wiz.command("fix").action((opts, deps) => new Fix(deps).run(opts));
```

Naming one implementation of a dependency that has several shuts the others
out, so a test cannot hand in the fake:

```ts
// Fs is implemented by NodeFs and FakeFs, so that is what the parameter is
export class Reader {
	constructor(private fs: NodeFs) {}
}
```
