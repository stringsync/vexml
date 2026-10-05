import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import NamedOptionsLast from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("named-options-last", () => {
	const rule = new NamedOptionsLast({
		decider: new FakeDecider({}, 0.9),
		llm: new FakeDecider(),
	});

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect(await rule.check(file)).toEqual([]);
	});

	it("asks about settings only where positional parameters crowd a signature", async () => {
		const decider = new FakeDecider({}, 0.3);
		const file = new SourceFile(
			"a.ts",
			[
				"function few(a: number, b: number, c: number) {}",
				"function many(a: number, b: string, c: string, d: boolean) {}",
				"function plenty(a: number, b: string, c: string, opts: ManyOptions = {}) {}",
			].join("\n"),
		);

		const findings = await new NamedOptionsLast({
			decider,
			llm: new FakeDecider(),
		}).check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			decider.asked.map((asked) => asked.about.line),
		]).toEqual([[[2, 0.3]], [2]]);
	});

	it("flags options ahead of an optional parameter, typed in place, or named other than opts", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"function read(path: string, opts: ReadOptions, fs?: Fs) {}",
				"function list(dir: string, opts: { deep?: boolean }) {}",
				"function walk(dir: string, options: WalkOptions) {}",
			].join("\n"),
		);

		expect((await rule.check(file)).map((finding) => finding.message)).toEqual([
			"Move fs into opts: a caller should not pass the options to reach it.",
			"Name the type of opts: declare an interface for it beside the function, after what it configures.",
			"Name options `opts`.",
		]);
	});

	it("flags options ahead of a parameter every call passes", async () => {
		const file = new SourceFile(
			"a.ts",
			"function write(opts: WriteOptions, path: string) {}\n",
		);

		expect((await rule.check(file)).map((finding) => finding.message)).toEqual([
			"Put opts last: move path ahead of it.",
		]);
	});

	it("takes neither a destructured object nor a deps object for the options", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"function add({ fs, log }: { fs: Fs; log: Log }, task: string, opts: AddOptions = {}) {}",
				"function move(deps: { fs: Fs }, at: { x: number }, by: number) {}",
			].join("\n"),
		);

		expect(await rule.check(file)).toEqual([]);
	});

	it("leaves a callback's parameters to the code that calls it", async () => {
		const file = new SourceFile(
			"a.ts",
			"program.action((opts, deps) => new Fix(deps).run(opts));\n",
		);

		expect(await rule.check(file)).toEqual([]);
	});
});
