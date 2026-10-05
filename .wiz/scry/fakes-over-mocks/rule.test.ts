import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import FakesOverMocks from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("fakes-over-mocks", () => {
	const rule = new FakesOverMocks();

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("flags a line once, and leaves names that only say mock", async () => {
		const file = new SourceFile(
			"a.test.ts",
			'const a = { f: mock(), g: mock() };\nnew MockDataGenerator();\nmockUsers();\nvi.spyOn(console, "log");\n',
		);

		expect((await rule.check(file)).map((finding) => finding.line)).toEqual([
			1, 4,
		]);
	});
});
