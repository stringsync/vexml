import { beforeEach, describe, expect, it } from "bun:test";

describe("cart", () => {
	let cart: Cart;

	beforeEach(() => {
		cart = new Cart();
		cart.add(apple);
	});

	it("totals the items added", () => {
		expect(cart.total()).toBe(apple.price);
	});

	it("empties when cleared", () => {
		cart.clear();
		expect(cart.total()).toBe(0);
	});

	it("throws when the cart is closed", () => {
		cart.close();
		expect(() => cart.add(pear)).toThrow();
	});
});
