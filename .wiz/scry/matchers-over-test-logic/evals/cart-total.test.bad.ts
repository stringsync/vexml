it("totals the cart", () => {
	if (cart.isEmpty()) {
		expect(cart.total()).toBe(0);
	} else {
		expect(cart.total()).toBeGreaterThan(0);
	}
});
