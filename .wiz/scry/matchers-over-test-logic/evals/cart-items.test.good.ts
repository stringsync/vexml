it("keeps the items in the order they were added", () => {
	expect(cart.items()).toEqual([apple, pear]);
});

it("prices every item it was given", () => {
	expect(cart.items()).toContainEqual({ name: "apple", price: 100 });
});
