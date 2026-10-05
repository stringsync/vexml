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
