it("refunds the difference when an item is returned", () => {
	const cart = new Cart([apple, pear]);
	cart.checkout();
	cart.returnItem(pear);
	expect(cart.refunded()).toBe(pear.price);
});
