import type { Finding, Rule, SourceFile, SyntaxNode } from "@webappwiz/scry";

/** The calls that mock or spy, in bun, vitest and jest. */
const MOCKING = new Set([
	"mock",
	"mock.module",
	"spyOn",
	"jest.fn",
	"jest.mock",
	"jest.doMock",
	"jest.spyOn",
	"vi.fn",
	"vi.mock",
	"vi.doMock",
	"vi.spyOn",
]);

/** Finds each line of a test that mocks or spies. */
export default class FakesOverMocks implements Rule {
	static readonly description =
		"A test hands in a fake of a focused interface rather than mocking or spying.";
	static readonly files = "**/*.test.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	async check(file: SourceFile): Promise<Finding[]> {
		return this.oncePerLine(this.mockingCalls(file)).map((call) =>
			call.flag(
				"Hand the code a fake of a focused interface instead of mocking or spying.",
			),
		);
	}

	private mockingCalls(file: SourceFile): SyntaxNode[] {
		return file.ts
			.findAll({ rule: { kind: "call_expression" } })
			.filter((call) => MOCKING.has(call.field("function")?.text ?? ""));
	}

	/** A line with two mocks on it is one thing to fix. */
	private oncePerLine(calls: SyntaxNode[]): SyntaxNode[] {
		const lines = new Map(calls.map((call) => [call.line, call]));
		return [...lines.values()].toSorted(
			(left, right) => left.line - right.line,
		);
	}
}
