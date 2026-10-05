import { describe, expect, it } from "bun:test";
import { Inventory } from "./inventory";

describe("Inventory", () => {
	it("reduces stock when an order ships", () => {
		const inventory = new Inventory();
		inventory.receive("sku-1", 10);
		inventory.ship("sku-1", 3);
		expect(inventory.onHand("sku-1")).toBe(7);
	});

	it("refuses to ship more than is on hand", () => {
		const inventory = new Inventory();
		inventory.receive("sku-1", 2);
		expect(() => inventory.ship("sku-1", 3)).toThrow("insufficient stock");
	});

	it("restores stock when a shipment is returned", () => {
		const inventory = new Inventory();
		inventory.receive("sku-1", 10);
		inventory.ship("sku-1", 3);
		inventory.returned("sku-1", 3);
		expect(inventory.onHand("sku-1")).toBe(10);
	});
});
