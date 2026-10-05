expect.extend({
	toBePriced(received: Item[]) {
		const missing = received.filter((item) => item.price === undefined);
		return {
			pass: missing.length === 0,
			message: () => `unpriced: ${missing.map((i) => i.name).join(", ")}`,
		};
	},
});

it("prices every item it was given", () => {
	expect(cart.items()).toBePriced();
});
