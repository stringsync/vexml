it("totals the items added", () => {
	for (const item of [apple, pear, plum]) {
		cart.add(item);
	}
	expect(cart.total()).toBe(300);
});
