import { beforeEach, describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import TestsOwnTheirState from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("tests-own-their-state", () => {
	let decider: FakeDecider;
	let rule: TestsOwnTheirState;

	beforeEach(() => {
		decider = new FakeDecider({}, 0.2);
		rule = new TestsOwnTheirState({ decider, llm: new FakeDecider() });
	});

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("asks the decider whether a class holding built objects is a harness", async () => {
		const file = new SourceFile(
			"a.test.ts",
			"class FakeOutbox {\n\treadonly sent = [];\n}\nclass Harness {\n\treadonly cart = new Cart();\n}\n",
		);

		const findings = await rule.check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			decider.asked.map((asked) => asked.about.line),
		]).toEqual([[[4, 0.2]], [4]]);
	});

	it("flags what a beforeEach builds that no test reads, or only one of several", async () => {
		const file = new SourceFile(
			"a.test.ts",
			[
				'describe("a", () => {',
				"\tbeforeEach(() => {",
				"\t\tshared = 1;",
				"\t\tonce = 2;",
				"\t\tnever = 3;",
				"\t});",
				'\tit("b", () => expect(shared + once).toBe(3));',
				'\tit("c", () => expect(shared).toBe(1));',
				"});",
			].join("\n"),
		);

		expect((await rule.check(file)).map((finding) => finding.message)).toEqual([
			"Only one test reads once: build it in that test.",
			"No test here reads never: drop it from beforeEach.",
		]);
	});

	it("counts a test reading setup through a helper, a fake object, what was built from it, and an afterEach cleaning it up", async () => {
		const file = new SourceFile(
			"a.test.ts",
			[
				'describe("a", () => {',
				"\tbeforeEach(() => {",
				"\t\tlog = new Log();",
				"\t\tproc = new Proc();",
				"\t\tps = new Ps({ proc });",
				"\t\troot = tmp();",
				"\t\ttyped = 'x';",
				"\t});",
				"\tafterEach(() => rm(root));",
				"\tconst input = { read: async () => typed };",
				"\tconst run = () => check({ log, ps, input });",
				'\tit("b", () => run());',
				'\tit("c", () => run());',
				"});",
			].join("\n"),
		);

		expect(await rule.check(file)).toEqual([]);
	});
});
