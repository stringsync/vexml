---
name: doc-comments-address-users
description: A doc comment on an export tells users what it is for, not maintainers how it is built.
files: "**/*.ts"
level: error
complexity: medium
recommended: true
version: 0.0.14
---
# Doc comments address users

A doc comment on an exported class, method, function, or type is read by
external users through their editor. It must speak to them: what the thing is
for and how to use it. Internal development details (implementation notes,
TODOs, refactoring history, caveats only a maintainer cares about) do not
belong there. Put those inside the body as regular comments.

## Good

```ts
/** Parses a raw CLI string into a typed value. Throws on bad input. */
export function parse(raw: string): Value {
	// Map lookup beats a switch here: options arrive in registration order.
	return table.get(raw) ?? fail(raw);
}
```

## Bad

```ts
/**
 * Parses a raw CLI string. Uses a Map internally instead of a switch.
 * TODO: revisit after the flag-parsing refactor lands.
 */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
```
