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
