---
name: resources-are-disposable
description: Whatever holds a timer, listener, socket or handle implements Resource and releases it in dispose.
files: "**/*.ts"
level: error
complexity: medium
recommended: true
version: 0.0.13
---
# Resources are disposable

Anything that keeps something alive past the call that made it holds a
resource: a timer, a subscription, a listener on an object you did not create,
a worker, a socket, a file handle, an observer. Every one of those needs a way
to be released, and it is the holder's job to offer it.

Implement `Resource` from `webappwiz/disposable` and release the resource in
`dispose()`, or `AsyncResource` and `disposeAsync()` when the release has to
be awaited. Never invent a second name for it: a `close()`, `destroy()`,
`stop()`, `cleanup()` or `unsubscribe()` doing the same job is the same
interface under a name no caller can compose. A method that hands out a
resource returns a `Resource` rather than an id or a handle, so cancelling is
the same move as releasing anything else.

Holders of several resources own a `Disposer` (or `AsyncDisposer`) and register
each resource as they take it. It releases in reverse, so a resource outlives
whatever it depends on, and `dispose()` is safe to call twice. `disposables`
covers the cases where there is no object to hand: `disposables.callback` wraps
a function, `disposables.noop` stands in for nothing, `disposables.nullable`
for a resource that may not exist.

Disposal is not optional bookkeeping. A class that holds a resource and offers
no way out is a leak the caller cannot fix, however short its life looks
today.

## Good

The holder implements `Resource` and a `Disposer` releases what it took:

```ts
import { type Resource, Disposer } from "webappwiz/disposable";

export class Poller implements Resource {
	private disposer = new Disposer();

	constructor(timer: Timer, source: Source) {
		this.disposer.use(timer.setInterval(() => this.poll(), Duration.seconds(5)));
		this.disposer.use(source.events.on("changed", () => this.poll()));
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
```

Handing out a resource means handing back a `Resource`:

```ts
export interface Timer {
	setTimeout(callback: () => void, delay: Duration): Resource;
}
```

Something with nothing to release says so, rather than making its caller ask:

```ts
export class FakeUploads implements Uploads {
	dispose(): void {}
}
```

An awaited release is `AsyncResource`, and an owner of several uses
`AsyncDisposer`:

```ts
export class Server implements AsyncResource {
	private disposer = new AsyncDisposer();

	constructor(private server: Bun.Server, db: Database) {
		this.disposer.use(db);
		this.disposer.defer(() => this.server.stop());
	}

	disposeAsync = this.disposer.disposeAsync;
}
```

## Bad

A resource with no way out. The interval runs until the process does:

```ts
export class Poller {
	constructor(timer: Timer, source: Source) {
		timer.setInterval(() => this.poll(), Duration.seconds(5));
		source.events.on("changed", () => this.poll());
	}
}
```

Release under another name, which no `Disposer` can take and every caller has
to remember separately:

```ts
export class Watcher {
	close(): void {
		this.unlisten();
	}
}
```

Handing back an id, so cancelling is a second thing to learn and a value to
keep safe:

```ts
export interface Timer {
	setTimeout(callback: () => void, delay: Duration): number;
	clearTimeout(id: number): void;
}
```

Hand-rolled bookkeeping in place of a `Disposer`, which leaks the moment one
release throws or an early return skips the rest:

```ts
export class Poller implements Resource {
	private timeouts = [] as number[];
	private unlisteners = [] as (() => void)[];

	dispose(): void {
		for (const id of this.timeouts) clearTimeout(id);
		for (const unlisten of this.unlisteners) unlisten();
	}
}
```
