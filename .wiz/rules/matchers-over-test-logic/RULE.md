---
name: matchers-over-test-logic
description: A test carries no if and no for; a matcher decides what the logic would have.
files: "**/*.test.ts"
level: error
complexity: low
recommended: true
version: 0.0.13
---
# Matchers over test logic

A test carries no `if` and no `for`. A branch in a test means the test does not
know what it expects, and a loop means the assertion is somewhere in the
middle of the file rather than at the end of the test: either way the reader
has to run the test in their head to learn what passing looks like, and a
failure points at the line that happened to blow up instead of at the claim
that broke.

Whatever the branch or the loop was deciding, a matcher already decides.
Compare the whole value at once with `toEqual`, ask about membership with
`toContainEqual`, and let the matcher report the difference. Where nothing
built in fits, name the claim as a matcher of your own with `expect.extend`
and keep the logic there, where it is written once and its failure message is
written with it.

The same goes for the setup around the assertion: a test builds its subject
straight through, and repetition across tests moves to `beforeEach` or a
harness rather than to a loop.

## Good

```ts
it("keeps the items in the order they were added", () => {
	expect(cart.items()).toEqual([apple, pear]);
});

it("prices every item it was given", () => {
	expect(cart.items()).toContainEqual({ name: "apple", price: 100 });
});
```

A claim with no matcher behind it becomes one:

```ts
expect.extend({
	toBePriced(received: Item[]) {
		const missing = received.filter((item) => item.price === undefined);
		return {
			pass: missing.length === 0,
			message: () => `unpriced: ${missing.map((i) => i.name).join(", ")}`,
		};
	},
});

it("prices every item it was given", () => {
	expect(cart.items()).toBePriced();
});
```

## Bad

A loop hiding the assertion, reporting only the first item that fails:

```ts
it("prices every item it was given", () => {
	for (const item of cart.items()) {
		expect(item.price).toBeDefined();
	}
});
```

A branch, so the test passes whichever way the code went:

```ts
it("totals the cart", () => {
	if (cart.isEmpty()) {
		expect(cart.total()).toBe(0);
	} else {
		expect(cart.total()).toBeGreaterThan(0);
	}
});
```

A loop building the subject, which a `beforeEach` or a harness holds instead:

```ts
it("totals the items added", () => {
	for (const item of [apple, pear, plum]) {
		cart.add(item);
	}
	expect(cart.total()).toBe(300);
});
```
