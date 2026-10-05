import type { Finding, Rule, SourceFile, SyntaxNode } from "@webappwiz/scry";

const BRANCHES = ["if_statement", "switch_statement"];
const LOOPS = [
	"for_statement",
	"for_in_statement",
	"while_statement",
	"do_statement",
];

/** Finds an `if` or a loop in the body of a test. */
export default class MatchersOverTestLogic implements Rule {
	static readonly description =
		"A test carries no if and no for; a matcher decides what the logic would have.";
	static readonly files = "**/*.test.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	async check(file: SourceFile): Promise<Finding[]> {
		return file.ts
			.tests()
			.flatMap((test) => [
				...this.statements(test, BRANCHES).map((branch) =>
					branch.flag(
						"Assert what this branch decides with a matcher, so the test expects one thing.",
					),
				),
				...this.statements(test, LOOPS).map((loop) =>
					loop.flag(
						"Compare the whole value with a matcher, like toEqual or toContainEqual, and build the subject straight through, not in a loop.",
					),
				),
			]);
	}

	private statements(test: SyntaxNode, kinds: string[]): SyntaxNode[] {
		return test.findAll({ rule: { any: kinds.map((kind) => ({ kind })) } });
	}
}
