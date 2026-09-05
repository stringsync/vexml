---
name: test-setup-names-what-it-makes
description: Test setup is named for the thing it makes, never a harness.
files: "**/{*.test,testing}.ts"
level: error
complexity: low
recommended: true
version: 0.0.14
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

One piece of apparatus may be named for itself: a class called `Testing`,
exported from a module's `testing.ts`. It is instantiable, and what it holds
is the dependencies a test runs against, the fakes and the wiring between
them, so a test that needs all of them gets them in one line. It is allowed
where a harness is not because it claims nothing: it does not pretend to be a
checkout or a cart, and the test still names every domain thing it got.

Reaching for one is the last step, not the first. Setup belongs in the `it`
that needs it, then in that `describe`'s `beforeEach` when several tests share
it, and only then in a `Testing` object, once wiring the dependencies in each
test hides the behavior under test. Small enough to say in a line or two means
it stays in the test. A `Testing` object coordinates dependencies; the state a
test is about stays with the test, as `tests-own-their-state` says.

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

A `Testing` object holding the dependencies a checkout runs against, when
wiring them up in each test would bury the behavior:

```ts
/** The dependencies a checkout runs against, wired together. */
export class Testing {
	readonly gateway = new FakeGateway();
	readonly catalog = new Catalog([apple, pear]);

	session(): Session {
		return Session.begin(this.gateway, this.catalog);
	}
}
```

The test builds its own cart and names it, and reads the dependency it
asserts on off the `Testing`:

```ts
describe("checkout", () => {
	let testing: Testing;

	beforeEach(() => {
		testing = new Testing();
	});

	it("charges the cart total", () => {
		const cart = testing.session().cart();
		cart.add(apple);
		cart.checkout();
		expect(testing.gateway.charges[0]).toBe(apple.price);
	});
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

The same harness under the allowed name, owning the cart the tests are about
instead of the dependencies they run against:

```ts
export class Testing {
	readonly cart = new Cart();

	withItems(...items: Item[]): this {
		for (const item of items) this.cart.add(item);
		return this;
	}
}
```

A `Testing` object standing in for setup the test could do in a line:

```ts
export class Testing {
	readonly cart = new Cart();
}

it("is empty when new", () => {
	expect(new Testing().cart.total()).toBe(0);
});
```
