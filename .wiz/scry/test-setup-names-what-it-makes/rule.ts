import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

const HARNESS = /harness/i;

/** Every kind of node that names something, in a declaration or a use. */
const NAMES = [
	"identifier",
	"type_identifier",
	"property_identifier",
	"shorthand_property_identifier",
	"shorthand_property_identifier_pattern",
];

const OWNS_THE_SUBJECT =
	"Does this Testing class hold the thing the tests are about, like a cart or playlist they build up or a single object a test could make in one line, rather than the fakes and dependencies the code under test runs against?";

/**
 * Finds test setup named for machinery: anything called a harness, a
 * comment calling it one, and a `Testing` object that holds the subject
 * of the tests rather than their dependencies.
 */
export default class TestSetupNamesWhatItMakes implements Rule {
	static readonly description =
		"Test setup is named for the thing it makes, never a harness.";
	static readonly files = "**/{*.test,testing}.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return [
			...this.namesCalledAHarness(file),
			...this.commentsCallingItAHarness(file),
			...(await this.testingHoldingTheSubject(file)),
		].toSorted((left, right) => left.line - right.line);
	}

	/** Each name with "harness" in it, where the file first says it. */
	private namesCalledAHarness(file: SourceFile): Finding[] {
		const first = new Map<string, SyntaxNode>();
		for (const name of file.ts.findAll({
			rule: { any: NAMES.map((kind) => ({ kind })) },
		})) {
			if (HARNESS.test(name.text) && !first.has(name.text)) {
				first.set(name.text, name);
			}
		}
		return [...first.values()].map((name) =>
			name.flag(
				`Name ${name.text} for what it makes, like repo() or cartOf(...), not for the machinery.`,
			),
		);
	}

	private commentsCallingItAHarness(file: SourceFile): Finding[] {
		return file.ts
			.comments()
			.filter((comment) => HARNESS.test(comment.text))
			.map((comment) =>
				comment.flag(
					"Say what this setup makes instead of calling it a harness.",
				),
			);
	}

	/**
	 * A `Testing` class may hold the dependencies a test runs against, never
	 * the thing a test is about; the som tells which it holds.
	 */
	private async testingHoldingTheSubject(file: SourceFile): Promise<Finding[]> {
		const candidates = file.ts
			.topLevel()
			.filter(
				(statement) =>
					statement.is("class_declaration") &&
					statement.field("name")?.text === "Testing",
			);
		return Promise.all(
			candidates.map(async (testing) =>
				testing.flag(
					"Testing should hold only the dependencies a test runs against: build the thing the test is about in the test, or its beforeEach.",
					await this.som.decide(OWNS_THE_SUBJECT, testing),
					OWNS_THE_SUBJECT,
				),
			),
		);
	}
}
