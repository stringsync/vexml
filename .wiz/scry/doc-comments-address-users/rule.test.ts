import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import DocCommentsAddressUsers from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("doc-comments-address-users", () => {
	it.each(cases.bad)(
		"flags or asks about a doc comment in $name",
		async ({ file }) => {
			const som = new FakeDecider();

			const findings = await new DocCommentsAddressUsers({
				som,
				llm: new FakeDecider(),
			}).check(file);

			expect([
				...som.asked,
				...findings.filter((finding) => finding.confidence === 1),
			]).not.toEqual([]);
		},
	);

	it("flags a TODO in a doc comment on an export without asking", async () => {
		const som = new FakeDecider();
		const file = new SourceFile(
			"a.ts",
			"/** Parses. TODO: drop the switch. */\nexport function parse() {}\n",
		);

		const findings = await new DocCommentsAddressUsers({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			som.asked,
		]).toEqual([[[1, 1]], []]);
	});

	it("asks about doc comments on exports and their public members only", async () => {
		const som = new FakeDecider();
		const file = new SourceFile(
			"a.ts",
			[
				"/** Kept. */",
				"function hidden() {}",
				"/** Exported. */",
				"export class Store {",
				"\t/** Public. */",
				"\tget() {}",
				"\t/** Private. */",
				"\tprivate load() {}",
				"}",
				"class Inner {",
				"\t/** Unexported class. */",
				"\tget() {}",
				"}",
				"export interface Options {",
				"\t/** A field. */",
				"\tsize: number;",
				"}",
			].join("\n"),
		);

		await new DocCommentsAddressUsers({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect(som.asked.map((asked) => asked.about.line)).toEqual([3, 5, 15]);
	});

	it("flags with the som's answer", async () => {
		const som = new FakeDecider({ ResizeQueue: 0.8 });
		const file = new SourceFile(
			"a.ts",
			"/** This used to live in ResizeQueue. */\nexport function resize() {}\n",
		);

		const findings = await new DocCommentsAddressUsers({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.map((finding) => finding.confidence)).toEqual([0.8]);
	});

	it("leaves a doc comment tagged @internal, which is for maintainers by design", async () => {
		const som = new FakeDecider({}, 0.9);
		const file = new SourceFile(
			"a.ts",
			[
				"export class Store {",
				"\t/** @internal Writes under the lock. TODO: batch writes. */",
				"\tsave() {}",
				"\t/**",
				"\t * Reads a todo.",
				"\t */",
				"\tread() {}",
				"}",
			].join("\n"),
		);

		const findings = await new DocCommentsAddressUsers({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			findings.map((finding) => finding.line),
			som.asked.map((asked) => asked.about.line),
		]).toEqual([[4], [4]]);
	});
});
