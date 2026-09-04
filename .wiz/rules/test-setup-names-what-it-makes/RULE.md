---
name: test-setup-names-what-it-makes
description: Test setup is named for the thing it makes, never a harness.
files: "**/{*.test,testing}.ts"
level: error
complexity: low
recommended: true
version: 0.0.13
---
# Test setup names what it makes

Nothing a test uses is called a harness. Not a `TestHarness` class, not a
`harness` variable, not a `makeHarness` function, and not "the harness" in a
comment about one. The word names machinery, and machinery is the one thing a
reader does not need to know about: what they need is what the setup made.

Setup is named for that instead. A function that builds a repository is
`repo()`, one that builds a stocked cart is `cartOf(...)`, one that starts a
browser is `browser()`. The name says what comes back, so a test that calls it
reads without opening the other file.

The plain words a test framework already uses are fine, because they say what
they are: `setup`, `beforeEach`, `deps`, `fixture`. What is banned is the word
that stands in for the domain rather than naming it.

## Good

A fixture named for what it makes, in `testing.ts`:

```ts
/** A throwaway git repo with one commit on `main`. */
export async function repo() {
	const root = await mkdtemp(join(tmpdir(), "arbor-"));
	await git(root, "init", "-b", "main");
	return { root, git };
}
```

The test says what it got:

```ts
it("lands the branch on trunk", async () => {
	const { root } = await repo();
	...
});
```

## Bad

The machinery in the name:

```ts
export class CheckoutHarness {
	// ...
}

it("charges the cart total", () => {
	const harness = new CheckoutHarness();
	// ...
});
```

The same move under another word, still naming the apparatus rather than the
thing it makes:

```ts
function makeTestHarness() {
	// ...
}
```

A comment that calls it one, when the code has a better name:

```ts
// The harness every test in this file runs against.
export function repo() {
	// ...
}
```
