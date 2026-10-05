import { describe, expect, it } from "bun:test";
import { SearchIndex } from "./search-index";

// The harness each test below builds its index from.
function indexOf(...documents: string[]): SearchIndex {
	const index = new SearchIndex();
	documents.forEach((text, position) => index.add({ id: String(position), text }));
	return index;
}

describe("SearchIndex", () => {
	it("finds a document by a word it contains", () => {
		const index = indexOf("red apple", "green pear");
		expect(index.search("pear").map((hit) => hit.id)).toEqual(["1"]);
	});

	it("ranks documents with more matches higher", () => {
		const index = indexOf("apple", "apple apple pie");
		expect(index.search("apple")[0].id).toBe("1");
	});
});
