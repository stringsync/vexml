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
