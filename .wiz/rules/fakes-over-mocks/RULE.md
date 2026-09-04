---
name: fakes-over-mocks
description: A test hands in a fake of a focused interface rather than mocking or spying.
files: "**/*.test.ts"
level: error
complexity: medium
recommended: true
version: 0.0.13
---
# Fakes over mocks

A test thick with `mock` and `spyOn` calls is a signal, not a style: the code
under test wants a dependency it can be handed, so hand it a fake. Do not fake
a huge surface like a Web API; define a focused interface that names what the
code actually does with the dependency, and fake that. The production class
implements it against the real thing, the fake implements it in a few lines,
and the mocks disappear.

## Good

```ts
interface Charges {
	charge(amount: number): void;
}

class FakeCharges implements Charges {
	readonly amounts: number[] = [];

	charge(amount: number): void {
		this.amounts.push(amount);
	}
}

it("charges the card for the cart total", () => {
	const charges = new FakeCharges();
	new Checkout(charges).buy(apple);
	expect(charges.amounts).toEqual([apple.price]);
});
```

## Bad

Stubbing out a platform API call by call:

```ts
it("charges the card for the cart total", () => {
	const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(JSON.stringify({ ok: true }), { status: 200 }),
	);
	new Checkout().buy(apple);
	expect(fetchSpy).toHaveBeenCalledWith(
		"https://pay.example.com/charge",
		expect.objectContaining({ method: "POST" }),
	);
});
```
