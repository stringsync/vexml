describe("cart", () => {
	beforeEach(() => {
		gateway = new FakeGateway({ retries: 3 });
		catalog = new Catalog([apple, pear, plum]);
		user = buildUser("us");
		session = Session.begin(gateway, catalog, user);
		cart = session.cart();
		cart.add(apple);
	});

	it("is empty when new", () => {
		expect(new Cart().total()).toBe(0);
	});
});
