---
name: tests-own-their-state
description: Tests set up their own state; shared setup only names steps and never builds the world.
files: "**/{*.test,testing}.ts"
level: error
complexity: medium
recommended: true
version: 0.0.14
---
# Tests own their state

Shared setup never owns state. It exists for one reason: to make a test
readable. Naming a step, hiding a noisy construction behind a verb, turning an
assertion into a sentence, all fine. Building the world the test runs against
is not, because a reader who has to open another file to learn what state a
test started in has lost the test.

State belongs to the test. Setup moves out of it in this order, and each step
down has to be earned:

1. In the `it` that needs it. Always start here.
2. In that `describe`'s `beforeEach`, when several tests share the scenario.
   It builds what those tests share and nothing else, carrying no value only
   one of them cares about: data a single test asserts on stays in that test.
3. In a shared helper, only when the setup for one test is unusually complex.
   It holds no data of its own. Whatever a test varies, the test passes in or
   does itself, and the helper keeps nothing between calls.

What buys a step down is complexity, never repetition. The same three lines of
setup written out in five tests is the readable version: the coordination the
tests are about is on the screen, and a reader following one test never leaves
it. Fold them away only when the setup is intricate enough that repeating it
hides what each test is doing.

A helper earns its place by what it takes out of the test body: an `if`, a
`for`, a construction the test cannot say in a line. A helper that only saves
typing has cost a reader the scenario and bought nothing.

## Good

The scenario a test needs, in the test:

```ts
it("refunds the difference when an item is returned", () => {
	const cart = new Cart([apple, pear]);
	cart.checkout();
	cart.returnItem(pear);
	expect(cart.refunded()).toBe(pear.price);
});
```

Shared state in a `beforeEach`, scoped to the tests that share it:

```ts
describe("checkout", () => {
	let cart: Cart;

	beforeEach(() => {
		cart = new Cart([apple, pear]);
		cart.checkout();
	});

	it("charges the cart total", () => {
		expect(cart.charged()).toBe(apple.price + pear.price);
	});

	it("refunds the difference when an item is returned", () => {
		cart.returnItem(pear);
		expect(cart.refunded()).toBe(pear.price);
	});
});
```

A helper at the bottom of the file, earning its place by taking a loop out of
the test and holding nothing:

```ts
it("charges each item once when a checkout is retried", () => {
	const cart = stockedCart(apple, pear, plum);
	cart.checkout();
	cart.checkout();
	expect(cart.charges()).toEqual([apple.price, pear.price, plum.price]);
});

function stockedCart(...items: Item[]): Cart {
	const cart = new Cart();
	for (const item of items) {
		cart.add(item, { until: item.expires });
	}
	return cart;
}
```

## Bad

A helper that owns the state the tests are about, named for its machinery on
top of it:

```ts
export class CheckoutHarness {
	readonly gateway = new FakeGateway();
	private readonly cart = new Cart();

	withItems(...items: Item[]): this {
		for (const item of items) this.cart.add(item);
		return this;
	}

	checkout(): void {
		this.cart.checkout(this.gateway);
	}
}

it("charges the cart total", () => {
	const harness = new CheckoutHarness().withItems(apple, pear);
	harness.checkout();
	expect(harness.gateway.charges[0]).toBe(apple.price + pear.price);
});
```

A `beforeEach` at the top of the file building a world every test wades
through, most of it for tests elsewhere in the file, with values only one test
ever looks at:

```ts
describe("cart", () => {
	beforeEach(() => {
		gateway = new FakeGateway({ retries: 3 });
		catalog = new Catalog([apple, pear, plum]);
		user = buildUser("us");
		session = Session.begin(gateway, catalog, user);
		cart = session.cart();
		cart.add(apple);
	});

	it("is empty when new", () => {
		expect(new Cart().total()).toBe(0);
	});
});
```

A helper that keeps state between calls:

```ts
let carts: Cart[] = [];

function newCart(): Cart {
	const cart = new Cart();
	carts.push(cart);
	return cart;
}
```
