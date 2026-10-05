---
version: 0.0.36
---
# Objects over callbacks

This rule is about the function types you declare, not the calls you make.
Passing a function to an API someone else declared, like `.map`, `.then`,
`.action` or `Events.on`, is that API's contract and never a violation.
A function-typed parameter of your own is judged by when the callee runs
the function:

- During the call, to compute the call's result: a predicate, comparator
  or transform. That is functional programming, and fine. So is a body
  the call runs before it returns, inside something it opens and closes,
  like a server it starts and stops around the body.
- After the call returns, because something happened: that is a
  notification. Expose `Events` from `webappwiz/events` instead of taking
  an `onDone`.
- Across an object's life, as part of how it does its job: that is a
  dependency. Name an interface and inject an object.

An options bag of callbacks such as `{ onStart, onError }` is an events
interface begging to exist. A React component's props are not such a bag:
they are how React passes events, so `onSelect` in the props of a function
that returns JSX, or of a PascalCase function used as JSX, is fine. When a bare function genuinely is the cleanest
design, keep it and `scry-ignore` the declaration with the reason: one
marker at the declaration covers every call site.

A function type you give a name is the same choice one step out. A named
type exists to be implemented, so make it an interface with a method once
more than one thing implements it, or a second implementation is coming,
or anything has to inject it. A method has a name to call, and an
implementation has a class to hold its own dependencies, which is what
injection and extension need. A named function type with one local
implementation that nothing injects can stay a function type.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
