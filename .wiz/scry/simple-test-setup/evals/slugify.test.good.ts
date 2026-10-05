import { describe, expect, it } from "bun:test";
import { slugify } from "./slugify";

describe("slugify", () => {
	it("lowercases the title", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	it("keeps digits when the title has numbers", () => {
		expect(slugify("Top 10 Tips")).toBe("top-10-tips");
	});

	it("drops punctuation when it sits between words", () => {
		expect(slugify("What's new, really?")).toBe("whats-new-really");
	});

	it("returns an empty string when the title is only spaces", () => {
		expect(slugify("   ")).toBe("");
	});
});
