import { beforeEach, describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import TestSetupNamesWhatItMakes from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("test-setup-names-what-it-makes", () => {
	let decider: FakeDecider;
	let rule: TestSetupNamesWhatItMakes;

	beforeEach(() => {
		decider = new FakeDecider({ Cart: 0.85 }, 0.1);
		rule = new TestSetupNamesWhatItMakes({ decider, llm: new FakeDecider() });
	});

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("finds no harness by name in $name", async ({ file }) => {
		const refusing = new TestSetupNamesWhatItMakes({
			decider: new FakeDecider({}, 0),
			llm: new FakeDecider(),
		});

		expect(
			(await refusing.check(file)).filter(({ confidence }) => confidence > 0),
		).toEqual([]);
	});

	it("flags each harness name once, where the file first says it", async () => {
		const file = new SourceFile(
			"a.test.ts",
			[
				'import { startHarness, type WebhookHarness } from "./testing";',
				"let harness: WebhookHarness;",
				"harness = await startHarness();",
				"const { harnessed } = harness;",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect(findings.map(({ line }) => line)).toEqual([1, 1, 2, 4]);
	});

	it("flags a comment that calls the setup a harness", async () => {
		const file = new SourceFile(
			"a.test.ts",
			"// The harness every test runs against.\nexport function repo() {}\n",
		);

		const findings = await rule.check(file);

		expect(findings.map(({ line }) => line)).toEqual([1]);
	});

	it("asks the decider whether a Testing class holds the subject, and no other class", async () => {
		const file = new SourceFile(
			"testing.ts",
			[
				"export class Fakes {",
				"\treadonly cart = new Cart();",
				"}",
				"export class Testing {",
				"\treadonly cart = new Cart();",
				"}",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect([
			decider.asked.map(({ about }) => about.line),
			findings.map(({ line, confidence }) => [line, confidence]),
		]).toEqual([[4], [[4, 0.85]]]);
	});
});
