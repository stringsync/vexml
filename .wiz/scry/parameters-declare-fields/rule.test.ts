import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import ParametersDeclareFields from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("parameters-declare-fields", () => {
	const rule = new ParametersDeclareFields();

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("flags each copy at the top of the constructor, after super, until something else", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"class A extends B {",
				"\tconstructor(a, b, private c, d) {",
				"\t\tsuper();",
				"\t\tthis.a = a;",
				"\t\tthis.b = b;",
				"\t\tthis.c = c;",
				"\t\tthis.d = d;",
				"\t}",
				"}",
			].join("\n"),
		);

		expect((await rule.check(file)).map((finding) => finding.line)).toEqual([
			4, 5,
		]);
	});
});
