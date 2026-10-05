import { describe, expect, it } from "bun:test";
import { parseDuration } from "./duration";

describe("parseDuration", () => {
	it("reads a bare number as milliseconds", () => {
		expect(parseDuration("250")).toBe(250);
	});

	it("reads each unit it knows, and refuses the ones it does not", () => {
		expect(parseDuration("2s")).toBe(2_000);
		const minutes = "3m";
		expect(parseDuration(minutes)).toBe(180_000);
		const hours = "1h";
		expect(parseDuration(hours)).toBe(3_600_000);
		const mixed = "1h30m";
		expect(parseDuration(mixed)).toBe(5_400_000);
		const fortnight = "2w";
		expect(() => parseDuration(fortnight)).toThrow('unknown unit "w"');
	});
});
