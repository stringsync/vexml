import { beforeEach, describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import ResourcesAreDisposable from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("resources-are-disposable", () => {
	let som: FakeDecider;
	let rule: ResourcesAreDisposable;

	beforeEach(() => {
		som = new FakeDecider({}, 0.4);
		rule = new ResourcesAreDisposable({ som, llm: new FakeDecider() });
	});

	it.each(cases.bad)("flags $name", async ({ file }) => {
		expect(await rule.check(file)).not.toEqual([]);
	});

	it.each(cases.good)("passes $name", async ({ file }) => {
		expect([await rule.check(file), som.asked]).toEqual([[], []]);
	});

	it("asks whether a close() releases anything when the class takes nothing it can see", async () => {
		const file = new SourceFile(
			"a.ts",
			"export class Watcher {\n\tclose(): void {\n\t\tthis.unlisten();\n\t}\n}\n",
		);

		const findings = await rule.check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			som.asked.map((asked) => asked.about.line),
		]).toEqual([[[2, 0.4]], [1]]);
	});

	it("decides a close() by code when the class visibly takes a resource", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export class Ticker {",
				"\tconstructor() {",
				"\t\tthis.id = setInterval(() => this.tick(), 1000);",
				"\t}",
				"\tstop(): void {",
				"\t\tclearInterval(this.id);",
				"\t}",
				"}",
			].join("\n"),
		);

		const findings = await rule.check(file);

		expect([
			findings.map((finding) => [finding.line, finding.confidence]),
			som.asked,
		]).toEqual([[[5, 1]], []]);
	});

	it("leaves a resource released in the call that took it, or handed back to the caller", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export class Waiter {",
				"\tasync wait(): Promise<void> {",
				"\t\tconst id = setTimeout(() => {}, 10);",
				"\t\tawait this.work();",
				"\t\tclearTimeout(id);",
				"\t}",
				"\twatch(target: Target): Resource {",
				'\t\treturn target.events.on("change", () => {});',
				"\t}",
				"}",
			].join("\n"),
		);

		expect(await rule.check(file)).toEqual([]);
	});

	it("leaves a factory named open, a listener on what the call made, a static timer, and a call handed no function", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export class Project {",
				"\tasync load(dir: string): Promise<Decisions> {",
				"\t\tconst decisions = await Decisions.open(dir);",
				"\t\tconst child = spawn(dir);",
				'\t\tchild.on("exit", () => this.done());',
				"\t\treturn decisions;",
				"\t}",
				"\tstatic later(): void {",
				"\t\trequestAnimationFrame(() => {});",
				"\t}",
				"\tconstructor(balancer: Balancer) {",
				'\t\tbalancer.addListener("Listener", { port: 80 });',
				"\t}",
				"}",
			].join("\n"),
		);

		expect(await rule.check(file)).toEqual([]);
	});

	it("flags a handle kept in a field, and a listener on something handed in", async () => {
		const file = new SourceFile(
			"a.ts",
			[
				"export class Tail {",
				"\tasync start(): Promise<void> {",
				'\t\tthis.handle ??= await open("log");',
				"\t}",
				"}",
				"export class Beat {",
				"\tconstructor(target: Window) {",
				'\t\ttarget.addEventListener("focus", () => this.beat());',
				"\t}",
				"}",
			].join("\n"),
		);

		expect((await rule.check(file)).map((finding) => finding.line)).toEqual([
			1, 6,
		]);
	});

	it("leaves a plain number that no method taking a function hands out", async () => {
		const file = new SourceFile(
			"a.ts",
			"export interface Counter {\n\tcount(): number;\n\tclear(at: number): void;\n}\n",
		);

		expect(await rule.check(file)).toEqual([]);
	});
});
