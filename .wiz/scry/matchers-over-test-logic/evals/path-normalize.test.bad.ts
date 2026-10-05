import { describe, expect, it } from "vitest";
import { normalizePath } from "./path-normalize";

describe("normalizePath", () => {
	it("collapses repeated separators", () => {
		const result = normalizePath("src//lib///index.ts");
		if (process.platform === "win32") {
			expect(result).toBe("src\\lib\\index.ts");
		} else {
			expect(result).toBe("src/lib/index.ts");
		}
	});

	it("drops a trailing separator", () => {
		expect(normalizePath("docs/")).toBe("docs");
	});
});
