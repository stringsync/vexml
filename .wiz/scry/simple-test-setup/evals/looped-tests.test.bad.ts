for (const [items, total] of cases) {
	it(`totals ${items.length} items`, () => {
		const cart = new Cart();
		for (const item of items) cart.add(item);
		expect(cart.total()).toBe(total);
	});
}
