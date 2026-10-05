---
version: 0.0.36
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

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
