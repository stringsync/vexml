---
name: no-em-dashes
description: No em dashes, and no en dashes between words, in code, comments or prose.
files: "**/*.{ts,md}"
level: error
complexity: low
recommended: true
version: 0.0.13
---
<!-- rule-ignore-file no-em-dashes: the Bad examples have to show one -->

# No em dashes

Em dashes are the surest tell that a machine wrote the text, and a reader who
spots one starts discounting everything around it. Do not use them, in code,
in comments, or in prose.

Every em dash has a plainer replacement. A colon introduces what follows. A
comma joins a clause. Parentheses hold an aside. A full stop ends the thought
and starts a new one. Pick whichever fits and the sentence usually reads
better for it.

This covers the en dash between words too. Between numbers, an en dash is a
range and stays.

## Good

```ts
// stderr, not stdout: the report has to stay parseable
this.log.error(message);
```

```ts
/** Parses a raw CLI string into a typed value. Throws on bad input. */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
```

A range keeps its en dash:

```ts
const RETRY_WINDOW = "5–10 seconds";
```

## Bad

```ts
// stderr — the report has to stay parseable
this.log.error(message);
```

```ts
/** Parses a raw CLI string — throws on bad input — into a typed value. */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
```

Between words, an en dash is the same mistake:

```ts
// the report – parseable or not – is what matters
this.log.error(message);
```
