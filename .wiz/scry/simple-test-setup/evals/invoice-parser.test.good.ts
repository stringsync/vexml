import { beforeEach, describe, expect, it } from "bun:test";
import { InvoiceParser } from "./invoice-parser";

describe("InvoiceParser", () => {
	let parser: InvoiceParser;

	beforeEach(() => {
		parser = new InvoiceParser({ currency: "USD" });
	});

	it("reads the line items in order", () => {
		const invoice = parser.parse("Widget,2,500\nGadget,1,1200");
		expect(invoice.lines.map((line) => line.name)).toEqual(["Widget", "Gadget"]);
	});

	it("totals quantity times unit price", () => {
		const invoice = parser.parse("Widget,2,500\nGadget,1,1200");
		expect(invoice.totalCents).toBe(2200);
	});

	it("rejects a line with a negative quantity", () => {
		expect(() => parser.parse("Widget,-1,500")).toThrow("negative quantity");
	});
});
