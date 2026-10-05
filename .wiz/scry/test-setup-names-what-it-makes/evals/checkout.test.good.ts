describe("checkout", () => {
	let testing: Testing;

	beforeEach(() => {
		testing = new Testing();
	});

	it("charges the cart total", () => {
		const cart = testing.session().cart();
		cart.add(apple);
		cart.checkout();
		expect(testing.gateway.charges[0]).toBe(apple.price);
	});
});
