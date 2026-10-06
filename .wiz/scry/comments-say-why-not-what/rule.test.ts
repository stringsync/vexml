import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import CommentsSayWhyNotWhat from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("comments-say-why-not-what", () => {
	it.each(cases.bad)("asks about a comment in $name", async ({ file }) => {
		const som = new FakeDecider();

		await new CommentsSayWhyNotWhat({ som, llm: new FakeDecider() }).check(
			file,
		);

		expect(som.asked).not.toEqual([]);
	});

	it("flags each comment with the som's answer, at its line", async () => {
		const som = new FakeDecider({ increment: 0.9 }, 0.1);
		const file = new SourceFile(
			"a.ts",
			"// increment the counter\ncounter++;\nskip(); // the first is a header\n",
		);

		const findings = await new CommentsSayWhyNotWhat({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect(
			findings.map((finding) => [finding.line, finding.confidence]),
		).toEqual([
			[1, 0.9],
			[3, 0.1],
		]);
	});

	it("asks once about a run of line comments", async () => {
		const som = new FakeDecider();
		const file = new SourceFile(
			"a.ts",
			"// a sliding log: fixed windows\n// let a client send twice\nallow();\n",
		);

		await new CommentsSayWhyNotWhat({ som, llm: new FakeDecider() }).check(
			file,
		);

		expect(som.asked.map((asked) => asked.about.text)).toEqual([
			"// a sliding log: fixed windows\n// let a client send twice",
		]);
	});

	it("leaves doc comments and tool directives alone", async () => {
		const som = new FakeDecider();
		const file = new SourceFile(
			"a.ts",
			"/** Adds one. */\nfunction add() {\n\t// @ts-expect-error\n\treturn x + 1;\n}\n// biome-ignore lint: reason\nrun();\n",
		);

		await new CommentsSayWhyNotWhat({ som, llm: new FakeDecider() }).check(
			file,
		);

		expect(som.asked).toEqual([]);
	});
});
