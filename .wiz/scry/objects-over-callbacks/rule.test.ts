import { beforeEach, describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import ObjectsOverCallbacks from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("objects-over-callbacks", () => {
	let som: FakeDecider;
	let rule: ObjectsOverCallbacks;

	beforeEach(() => {
		som = new FakeDecider({}, 0.3);
		rule = new ObjectsOverCallbacks({ som, llm: new FakeDecider() });
	});

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name when the som says no", async ({ file }) => {
		const refusing = new ObjectsOverCallbacks({
			som: new FakeDecider({}, 0),
			llm: new FakeDecider(),
		});

		expect(
			(await refusing.check(file)).filter((finding) => finding.confidence > 0),
		).toEqual([]);
	});

	it("asks about a function parameter a constructor does not keep, pointing at the declaration", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export function largest(",
				"\twords: string[],",
				"\tsize: (word: string) => number,",
				"): string {",
				"\treturn words[0];",
				"}",
				"[1].map((item: number) => item);",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			som.asked.map((asked) => asked.about.line),
		]).toEqual([[[1, 0.3]], [1]]);
	});

	it("decides a kept constructor function and a bag of onX callbacks by code, and asks about an onX parameter", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"class Stamper {",
				"\tconstructor(private now: () => Date) {}",
				"\tsave(path: string, onDone?: () => void): void {}",
				"}",
				"interface Hooks {",
				"\tonStart: () => void;",
				"\tonError: (error: Error) => void;",
				"}",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			som.asked.map((asked) => asked.about.line),
		]).toEqual([
			[
				[2, 1],
				[3, 0.3],
				[5, 1],
			],
			[3],
		]);
	});

	it("leaves a named function type with one implementation that nothing injects", async () => {
		const file = new SourceFile(
			"a.ts",
			"type Format = (cents: number) => string;\nconst usd: Format = (cents) => String(cents);\n",
		);

		expect(await rule.check(file)).toEqual([]);
	});

	it("skips the onX members of a component's props, inline or named, and flags the same bag on a plain function", async () => {
		const file = new SourceFile(
			"a.tsx",
			[
				"interface ChipProps {",
				"\tonRemove: () => void;",
				"}",
				"const Chip = (props: ChipProps) => <button onClick={props.onRemove} />;",
				"function Row({ onOpen }: { onOpen: () => void }) {",
				"\treturn <Chip onRemove={onOpen} />;",
				"}",
				"function upload(callbacks: { onDone: () => void }): void {}",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect(findings.map((finding) => finding.line)).toEqual([8]);
	});
});
