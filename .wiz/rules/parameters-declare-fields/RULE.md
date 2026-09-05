---
name: parameters-declare-fields
description: A constructor parameter copied straight into a field of the same name carries the modifier instead.
files: "**/*.ts"
level: error
complexity: low
recommended: true
version: 0.0.14
---
# Parameters declare fields

A constructor parameter copied straight into a field of the same name writes
that name three times to say one thing. TypeScript declares the field from the
parameter: put the modifier on the parameter and delete both the declaration
and the assignment.

Only a plain `this.x = x` at the top of the constructor is that copy. A field
computed from a parameter, assigned under a condition, or named differently
from what it was given is a decision the constructor makes, and stays a
statement in the body.

## Good

The parameter declares the field:

```ts
export class Stamper {
	constructor(private readonly clock: Clock) {}
}
```

A field the constructor computes is the constructor's business:

```ts
export class Uptime {
	private readonly since: number;

	constructor(started: Date) {
		this.since = started.getTime();
	}
}
```

So is one the constructor chooses:

```ts
export class Retry {
	private readonly attempts: number;

	constructor(attempts?: number) {
		this.attempts = attempts ?? 3;
	}
}
```

## Bad

Declaration, parameter and assignment, all for one field:

```ts
export class Stamper {
	private readonly clock: Clock;

	constructor(clock: Clock) {
		this.clock = clock;
	}
}
```

The cost is per field, so a wide constructor pays it again and again:

```ts
export class Saver {
	private readonly files: FileSystem;
	private readonly path: string;

	constructor(files: FileSystem, path: string) {
		this.files = files;
		this.path = path;
	}
}
```
