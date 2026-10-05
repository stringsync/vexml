import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import OneClassPerFile from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("one-class-per-file", () => {
	const rule = new OneClassPerFile();

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("keeps the class the file is named for, wherever it sits", async () => {
		const file = new SourceFile(
			"lru-cache.ts",
			"class Entry {}\nexport class LruCache {}\n",
		);

		expect(await rule.check(file)).toEqual([
			{ line: 1, message: "Give Entry a file of its own.", confidence: 1 },
		]);
	});
});
