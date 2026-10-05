import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import MatchersOverTestLogic from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("matchers-over-test-logic", () => {
	const rule = new MatchersOverTestLogic();

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("leaves the logic in a matcher of the file's own", async () => {
		const file = new SourceFile(
			"a.test.ts",
			'expect.extend({ toBeEven(n) { if (n % 2) {} } });\nit("a", () => {\n\tfor (;;) {}\n});\n',
		);

		expect((await rule.check(file)).map((finding) => finding.line)).toEqual([
			3,
		]);
	});
});
