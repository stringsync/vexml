it("charges the card for the cart total", () => {
	const gateway = new Gateway(keys, { retries: 3, timeout: 500 });
	const catalog = new Catalog([apple, pear].map((p) => enrich(p, region)));
	const session = Session.begin(gateway, catalog, buildUser("us"));
	const cart = session.cart();
	cart.add(apple);
	session.checkout();
	expect(gateway.charges[0].amount).toBe(apple.price);
});
