import { beforeEach, describe, expect, it } from "vitest";
import { parseInvoice } from "./invoice-parser";

describe("parseInvoice", () => {
	let raw: string;

	beforeEach(() => {
		raw = ["INV-104,2024-03-01", "widget,2,450", "gasket,10,35"].join("\n");
	});

	it("reads the header", () => {
		expect(parseInvoice(raw).header).toEqual({
			number: "INV-104",
			issued: "2024-03-01",
		});
	});

	it("reads each line item", () => {
		expect(parseInvoice(raw).lines).toEqual([
			{ sku: "widget", quantity: 2, unitCents: 450 },
			{ sku: "gasket", quantity: 10, unitCents: 35 },
		]);
	});

	it("keeps the gasket line", () => {
		expect(parseInvoice(raw).lines).toContainEqual({
			sku: "gasket",
			quantity: 10,
			unitCents: 35,
		});
	});
});
