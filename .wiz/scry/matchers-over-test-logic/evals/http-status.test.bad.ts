import { describe, expect, it } from "vitest";
import { isRetryable } from "./http-status";

describe("isRetryable", () => {
	it("retries server errors and rate limits", () => {
		const codes = [429, 500, 502, 503, 504];
		for (const code of codes) {
			expect(isRetryable(code)).toBe(true);
		}
	});

	it("does not retry client errors", () => {
		expect(isRetryable(400)).toBe(false);
		expect(isRetryable(404)).toBe(false);
	});
});
