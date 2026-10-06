import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import SimpleTestSetup from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("simple-test-setup", () => {
	it.each(cases.bad)("flags $name", async ({ file }) => {
		const rule = new SimpleTestSetup({
			som: new FakeDecider({}, 0.9),
			llm: new FakeDecider(),
		});

		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		const rule = new SimpleTestSetup({
			som: new FakeDecider({}, 0.9),
			llm: new FakeDecider(),
		});

		expect(await rule.check(file)).toEqual([]);
	});

	it("flags a file whose tests come after more than 20 lines of setup, counting neither imports nor comments", async () => {
		const opening = (setup: number) =>
			new SourceFile(
				"a.test.ts",
				[
					'import { describe, it } from "bun:test";',
					"// a fake for the tests below",
					"class Fake {",
					...Array.from({ length: setup - 2 }, () => "\tfield = 1;"),
					"}",
					'describe("a", () => {});',
				].join("\n"),
			);
		const rule = new SimpleTestSetup({
			som: new FakeDecider(),
			llm: new FakeDecider(),
		});

		expect([
			(await rule.check(opening(20))).map((finding) => finding.line),
			(await rule.check(opening(21))).map((finding) => finding.line),
		]).toEqual([[], [3]]);
	});

	it("flags every describe after the first, nested or side by side", async () => {
		const file = new SourceFile(
			"a.test.ts",
			[
				'describe("a", () => {',
				'\tdescribe("b", () => {});',
				"});",
				'describe("c", () => {});',
			].join("\n"),
		);

		const findings = await new SimpleTestSetup({
			som: new FakeDecider(),
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.map((finding) => finding.line)).toEqual([2, 4]);
	});

	it("flags the outermost loop that declares tests, but not a loop inside a test", async () => {
		const file = new SourceFile(
			"a.test.ts",
			[
				"for (const row of rows) {",
				"\tfor (const cell of row) {",
				'\t\tit("reads the cell", () => {});',
				"\t}",
				"}",
				"cases.forEach((each) => it(each.title, () => {}));",
				'it("sums the rows", () => {',
				"\tfor (const row of rows) sum(row);",
				"});",
			].join("\n"),
		);

		const findings = await new SimpleTestSetup({
			som: new FakeDecider(),
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.map((finding) => finding.line)).toEqual([1, 6]);
	});

	it("flags titles that open on a gerund or a condition, and asks about ones that open on a name from the code", async () => {
		const som = new FakeDecider({}, 0.8);
		const file = new SourceFile(
			"a.test.ts",
			[
				'it("calling total sums the items", () => {});',
				'it("isEnabled returns false", () => {});',
				'it("when empty returns zero", () => {});',
				'it("totals the items added", () => {});',
			].join("\n"),
		);

		const findings = await new SimpleTestSetup({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			som.asked.map(({ about }) => about.line),
			findings.map(({ line, confidence }) => [line, confidence]),
		]).toEqual([
			[2],
			[
				[1, 1],
				[2, 0.8],
				[3, 1],
			],
		]);
	});

	it("asks about a test only when it declares several things before it first asserts", async () => {
		const som = new FakeDecider({ gateway: 0.9 }, 0.1);
		const file = new SourceFile(
			"a.test.ts",
			[
				'it("charges the card", () => {',
				"\tconst gateway = new Gateway();",
				"\tconst catalog = new Catalog();",
				"\tconst session = Session.begin(gateway, catalog);",
				"\tsession.checkout();",
				"});",
				'it("empties when cleared", () => {',
				"\tconst cart = new Cart();",
				"\tcart.clear();",
				"});",
				'it("reads each currency", () => {',
				'\texpect(parse("1 USD")).toBe(1);',
				'\tconst euros = "12 EUR";',
				"\texpect(parse(euros)).toBe(12);",
				'\tconst pounds = "3 GBP";',
				"\texpect(parse(pounds)).toBe(3);",
				'\tconst yen = "500 JPY";',
				"\texpect(parse(yen)).toBe(500);",
				"});",
			].join("\n"),
		);

		const findings = await new SimpleTestSetup({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			som.asked.map(({ about }) => about.line),
			findings.map(({ line, confidence }) => [line, confidence]),
		]).toEqual([[1], [[1, 0.9]]]);
	});
});
