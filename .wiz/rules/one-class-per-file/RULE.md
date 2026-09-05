---
name: one-class-per-file
description: A file declares one top-level class.
files: "**/*.ts"
level: error
complexity: low
recommended: true
version: 0.0.14
---
# One class per file

A class is a file's whole idea; a second top-level class wants a file of its
own. A reader looking for a class finds it by its file name, and a file
holding two answers to that search with neither.

Class expressions do not count, and helpers alongside the one class share its
file freely: the rule is about top-level declarations.

## Good

```ts
export class Stamper {
	constructor(private clock: Clock) {}
}

const pad = (n: number): string => String(n).padStart(2, "0");
```

A class expression is not a second declaration:

```ts
const Anonymous = class {};

export class Registry {}
```

## Bad

```ts
export class Stamper {
	constructor(private clock: Clock) {}
}

export class Formatter {
	format(stamp: string): string {
		return stamp.trim();
	}
}
```
