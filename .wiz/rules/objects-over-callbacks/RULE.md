---
name: objects-over-callbacks
description: A function called after the call returns is an event or a dependency, and a function type you name is an interface.
files: "**/*.ts"
level: warning
complexity: high
recommended: true
version: 0.0.13
---
# Objects over callbacks

This rule is about the function types you declare, not the calls you make.
Passing a function to an API someone else declared, like `.map`, `.then`,
`.action` or `Events.on`, is that API's contract and never a violation.
A function-typed parameter of your own is judged by when the callee runs
the function:

- During the call, to compute the call's result: a predicate, comparator
  or transform. That is functional programming, and fine.
- After the call returns, because something happened: that is a
  notification. Expose `Events` from `webappwiz/events` instead of taking
  an `onDone`.
- Across an object's life, as part of how it does its job: that is a
  dependency. Name an interface and inject an object.

An options bag of callbacks such as `{ onStart, onError }` is an events
interface begging to exist. When a bare function genuinely is the cleanest
design, keep it and `rule-ignore` the declaration with the reason: one
marker at the declaration covers every call site.

A function type you give a name is the same choice one step out. A named
type exists to be implemented, so make it an interface with a method once
more than one thing implements it, or a second implementation is coming,
or anything has to inject it. A method has a name to call, and an
implementation has a class to hold its own dependencies, which is what
injection and extension need. A named function type with one local
implementation that nothing injects can stay a function type.

## Good

Dependencies are objects behind interfaces:

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

Notifications are events; the owner dispatches, listeners subscribe:

```ts
export class Saver {
	private dispatcher = new Dispatcher<{ saved: string }>();
	readonly events: Events<{ saved: string }> = this.dispatcher.events;

	save(path: string): void {
		this.dispatcher.dispatch("saved", path);
	}
}
```

A contract with more than one implementation is an interface:

```ts
export interface Detector<Input, Output> {
	detect(input: Input): Output;
}

export class RegexDetector implements Detector<string, boolean> {
	constructor(private pattern: RegExp) {}

	detect(input: string): boolean {
		return this.pattern.test(input);
	}
}
```

A function run during the call to compute its result is fine:

```ts
export function largest(words: string[], size: (w: string) => number): string {
	return words.toSorted((a, b) => size(b) - size(a))[0] ?? "";
}
```

## Bad

A function-typed constructor parameter is a dependency in disguise:

```ts
export class Stamper {
	constructor(private now: () => Date) {}
}
```

A completion callback is a notification in disguise:

```ts
export class Saver {
	save(path: string, onDone: () => void): void {
		write(path);
		onDone();
	}
}
```

A named function type that several things implement, and something injects:

```ts
export type Detector<Input, Output> = (input: Input) => Output;

export class Scanner {
	constructor(private detect: Detector<string, boolean>) {}
}
```
