---
name: export-leads-the-file
description: The export a file is named for sits on its first screen, with helpers below it.
files: "**/*.ts"
level: error
complexity: low
recommended: true
version: 0.0.13
---
# Export leads the file

A file is named after one export, and that export is the reason to open the
file. It goes near the top, where a reader lands. Anything that pushes it down
the screen is paying for itself with someone else's time.

Types and constants the export depends on may sit above it: a reader meets a
name and its shape in one place, and neither is what they came for. A wall of
them is still a wall, so keep what sits above the export short enough that the
export is on the first screen.

Helper classes and functions never sit above it. Prefer no helper at all: a
step only this file takes is a private method of the class, where it is already
in reach of the state it needs. When a helper genuinely has to be free
standing, declare it with `function` at the bottom of the file, below the
export it serves, so a reader meets it only after they have read what calls it.

## Good

The export first, with helpers below it:

```ts
export class Stamper {
	constructor(private clock: Clock) {}

	stamp(message: string): string {
		return `${pad(this.clock.now())} ${message}`;
	}
}

function pad(at: Date): string {
	return at.toISOString().padStart(24, "0");
}
```

Types and constants above it, because the export is still the first thing a
reader lands on:

```ts
/** How loudly a violation reports. */
export type Level = "error" | "warning";

const RETRIES = 3;

export class Reporter {
	report(level: Level): void {}
}
```

A step only this file takes is a private method, not a free function:

```ts
export class Stamper {
	stamp(message: string): string {
		return `${this.pad(this.clock.now())} ${message}`;
	}

	private pad(at: Date): string {
		return at.toISOString().padStart(24, "0");
	}
}
```

## Bad

A helper above the export, so the file opens on something nobody imported:

```ts
function pad(at: Date): string {
	return at.toISOString().padStart(24, "0");
}

export class Stamper {
	stamp(message: string): string {
		return `${pad(this.clock.now())} ${message}`;
	}
}
```

An arrow helper above it is the same file with different syntax:

```ts
const pad = (at: Date): string => at.toISOString();

export class Stamper {}
```

Types pushing the export off the screen:

```ts
export interface StamperOptions {}
export interface StampResult {}
export interface StampFormat {}
export interface StampWindow {}
// ... sixty more lines of them

export class Stamper {}
```
