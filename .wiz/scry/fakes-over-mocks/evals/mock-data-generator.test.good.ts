import { describe, expect, it } from "bun:test";
import { MockDataGenerator } from "./mock-data-generator.ts";

describe("MockDataGenerator", () => {
	it("produces the same mock users for the same seed", () => {
		const a = new MockDataGenerator(7).users(3);
		const b = new MockDataGenerator(7).users(3);
		expect(a).toEqual(b);
	});

	it("gives every mock user a unique email", () => {
		const users = new MockDataGenerator(1).users(50);
		const emails = new Set(users.map((user) => user.email));
		expect(emails.size).toBe(50);
	});

	it("keeps mock order totals non-negative", () => {
		const orders = new MockDataGenerator(3).orders(20);
		expect(orders.every((order) => order.total >= 0)).toBe(true);
	});
});
