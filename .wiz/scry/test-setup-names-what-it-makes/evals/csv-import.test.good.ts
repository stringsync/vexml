import { beforeEach, describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { importContacts } from "./csv-import";

describe("importContacts", () => {
	let fixture: string;

	beforeEach(async () => {
		fixture = await readFile(new URL("./fixtures/contacts.csv", import.meta.url), "utf8");
	});

	it("reads one contact per row", () => {
		expect(importContacts(fixture)).toHaveLength(3);
	});

	it("trims whitespace around email addresses", () => {
		expect(importContacts(fixture)[0].email).toBe("ada@example.com");
	});
});
