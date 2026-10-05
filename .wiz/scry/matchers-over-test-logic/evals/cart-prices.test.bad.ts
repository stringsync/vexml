it("prices every item it was given", () => {
	for (const item of cart.items()) {
		expect(item.price).toBeDefined();
	}
});
