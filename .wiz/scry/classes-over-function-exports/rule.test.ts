import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import ClassesOverFunctionExports from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("classes-over-function-exports", () => {
	it.each(cases.bad)("asks about or flags $name", async ({ file }) => {
		const decider = new FakeDecider({}, 0.9);

		const findings = await new ClassesOverFunctionExports({
			decider,
			llm: new FakeDecider(),
		}).check(file);

		expect(findings).not.toEqual([]);
	});

	it.each(cases.good)("passes $name on code alone", async ({ file }) => {
		const decider = new FakeDecider({}, 0);

		const findings = await new ClassesOverFunctionExports({
			decider,
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.filter((finding) => finding.confidence > 0)).toEqual([]);
	});

	it("asks whether a type several exported functions take is a service they call", async () => {
		const decider = new FakeDecider({}, 0.8);
		const file = new SourceFile(
			"a.ts",
			[
				"export function find(db: Db, id: string) {",
				"\treturn db.get(id);",
				"}",
				"export const drop = (db: Db, id: string) => db.delete(id);",
				"export function only(point: Point) {}",
				"export function also(point: Point) {}",
			].join("\n"),
		);

		const findings = await new ClassesOverFunctionExports({
			decider,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			findings.map((finding) => [finding.line, finding.message]),
			decider.asked.map((asked) => asked.question),
		]).toEqual([
			[
				[
					1,
					"find and drop each take a Db: make them methods of one class that takes it in its constructor.",
				],
			],
			[
				"Is Db a service these functions call, like a database, store, clock or client, rather than data they read or build?",
			],
		]);
	});

	it("flags the class a cli action builds to call once", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export class Fix {",
				"\tasync run() {}",
				"}",
				'wiz.command("fix").action((opts, deps) => new Fix(deps).run(opts));',
			].join("\n"),
		);

		const findings = await new ClassesOverFunctionExports({
			decider: new FakeDecider(),
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.map((finding) => finding.line)).toEqual([1]);
	});

	it("asks about a constructor's type only when the file names a wider one", async () => {
		const decider = new FakeDecider({}, 0.8);
		const file = new SourceFile(
			"a.ts",
			[
				"import type { Fs } from './fs';",
				"export class Reader {",
				"\tconstructor(private fs: NodeFs, private writer: MarkdownWriter) {}",
				"}",
			].join("\n"),
		);

		await new ClassesOverFunctionExports({
			decider,
			llm: new FakeDecider(),
		}).check(file);

		expect(decider.asked.map((asked) => asked.question)).toEqual([
			"Is NodeFs one implementation of Fs, which has others, such as a fake for tests?",
		]);
	});
});
