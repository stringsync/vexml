import { describe, expect, it } from "bun:test";
import { DateRange } from "./date-range.ts";

describe("DateRange", () => {
	const march = new DateRange(new Date("2026-03-01"), new Date("2026-03-31"));

	it("contains a day inside the range", () => {
		expect(march.contains(new Date("2026-03-15"))).toBe(true);
	});

	it("excludes a day after the end", () => {
		expect(march.contains(new Date("2026-04-01"))).toBe(false);
	});

	it("counts days inclusively", () => {
		expect(march.days()).toBe(31);
	});

	it("rejects an end before the start", () => {
		expect(() => new DateRange(new Date("2026-03-02"), new Date("2026-03-01"))).toThrow();
	});
});
