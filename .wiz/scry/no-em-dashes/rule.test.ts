import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import NoEmDashes from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("no-em-dashes", () => {
	const rule = new NoEmDashes();

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("flags a line once however many dashes it holds, and leaves a range", async () => {
		const file = new SourceFile(
			"a.md",
			"a \u2014 b \u2014 c\n9\u201317\n9 \u2013 17\nwords \u2013 words\n",
		);

		expect((await rule.check(file)).map((finding) => finding.line)).toEqual([
			1, 4,
		]);
	});
});
