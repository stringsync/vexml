import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/** The functions that declare a test, as bun, vitest and jest name them. */
const TESTS = new Set(["it", "test"]);

/** What a test file opens on, when it opens on what is being tested. */
const OPENINGS = new Set(["describe", ...TESTS]);

const LOOPS = [
	"for_statement",
	"for_in_statement",
	"while_statement",
	"do_statement",
];

/** Array methods that run a callback once per element. */
const ITERATORS = new Set(["forEach", "map", "flatMap"]);

/** Words that put a condition, not a behavior, at the front of a title. */
const CONDITIONS = new Set(["when", "if", "given", "after", "with", "on"]);

/** How many declarations a test makes before it reads as mostly setup. */
const SETUP_DECLARATIONS = 3;

/**
 * How many lines of setup may sit between a test file's imports and its first
 * `describe` or `it`: a few constants or a short fake leave the tests on the
 * first screen, and a run of fake classes and helpers longer than this does not.
 */
const OPENING_SETUP_LINES = 20;

const ACTION_FIRST =
	'Does this test title lead with the action or method under test instead of the behavior, so that "it" followed by the title does not read as a sentence?';

const DROWNED =
	"Does the setup in this test bury the one behavior it checks, so a reader has to wade through construction details to find what is under test?";

/**
 * Finds a test file that is hard to read top to bottom: one that opens on
 * setup rather than its tests, more than one describe, tests a loop makes,
 * titles that lead with the action, and tests drowned in setup.
 */
export default class SimpleTestSetup implements Rule {
	static readonly description =
		"A test file opens on its one describe, its it titles complete the sentence, and shared setup sits in its beforeEach.";
	static readonly files = "**/*.test.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private decider: Decider;

	constructor(tools: Tools) {
		this.decider = tools.decider;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return [
			...this.setupBeforeTheTests(file),
			...this.extraDescribes(file),
			...this.testsALoopMakes(file),
			...(await this.titlesLeadingWithTheAction(file)),
			...(await this.setupDrowningTheBehavior(file)),
		].toSorted((left, right) => left.line - right.line);
	}

	/**
	 * More than `OPENING_SETUP_LINES` lines of statements between the imports
	 * and the first `describe` or `it`, so the file opens on the machinery
	 * rather than on what it tests.
	 */
	private setupBeforeTheTests(file: SourceFile): Finding[] {
		const [opening] = this.calls(file, OPENINGS);
		if (opening === undefined) {
			return [];
		}
		const setup = file.ts
			.topLevel()
			.filter(
				(statement) =>
					statement.end < opening.line &&
					!statement.is("import_statement", "comment"),
			);
		const lines = setup.reduce(
			(sum, statement) => sum + statement.end - statement.line + 1,
			0,
		);
		const [start] = setup;
		return start === undefined || lines <= OPENING_SETUP_LINES
			? []
			: [
					start.flag(
						`Open the file on what it tests: ${lines} lines of setup come before the first ${callee(opening)}. Move them into the beforeEach that needs them, or below the describe.`,
					),
				];
	}

	/** Every `describe` after the first, nested or side by side. */
	private extraDescribes(file: SourceFile): Finding[] {
		return this.calls(file, new Set(["describe"]))
			.slice(1)
			.map((describe) =>
				describe.flag(
					"Make one describe per file: fold this one into the first, or move its tests to a file of their own.",
				),
			);
	}

	/** A loop, or a callback per element, that declares tests. */
	private testsALoopMakes(file: SourceFile): Finding[] {
		const loops = file.ts.findAll({
			rule: {
				any: [
					...LOOPS.map((kind) => ({ kind })),
					{
						kind: "call_expression",
						has: {
							field: "function",
							kind: "member_expression",
							has: {
								field: "property",
								regex: `^(${[...ITERATORS].join("|")})$`,
							},
						},
					},
				],
			},
		});
		const tests = this.calls(file, TESTS);
		return loops
			.filter((loop) =>
				tests.some((test) => test.line >= loop.line && test.end <= loop.end),
			)
			.filter(
				(loop) =>
					!loops.some(
						(outer) =>
							outer !== loop &&
							outer.line <= loop.line &&
							outer.end >= loop.end,
					),
			)
			.map((loop) =>
				loop.flag(
					"Write each test out on its own, so a reader can follow it without running the loop in their head.",
				),
			);
	}

	/**
	 * Titles that cannot complete "it ...", because they open on a gerund like
	 * "calling" or on a condition like "when", and titles that may not,
	 * because they open on a name from the code like `isEnabled`. A decider
	 * reads only the names, since "URL-encodes" is one and still a verb.
	 */
	private async titlesLeadingWithTheAction(
		file: SourceFile,
	): Promise<Finding[]> {
		const candidates = this.calls(file, TESTS).flatMap((test) => {
			const title = test.field("arguments")?.children()[0];
			const opening = title?.is("string", "template_string")
				? opensOn(title.text.slice(1, -1))
				: undefined;
			return title === undefined || opening === undefined
				? []
				: [{ title, opening }];
		});
		return Promise.all(
			candidates.map(async ({ title, opening }) => {
				const message = `Lead with the behavior, so the title completes "it ...": ${title.text}.`;
				return opening === "name"
					? title.flag(
							message,
							await this.decider.decide(ACTION_FIRST, title),
							ACTION_FIRST,
						)
					: title.flag(message);
			}),
		);
	}

	/**
	 * Tests that declare several things before they first assert, which a
	 * decider weighs. A declaration after an assertion is an input to the
	 * next one, like each case a table of checks walks through, not setup.
	 */
	private async setupDrowningTheBehavior(file: SourceFile): Promise<Finding[]> {
		const candidates = file.ts
			.tests()
			.filter((test) => setup(test).length >= SETUP_DECLARATIONS);
		return Promise.all(
			candidates.map(async (test) =>
				test.flag(
					"Move the setup this test shares with others into its describe's beforeEach, so the behavior under test leads.",
					await this.decider.decide(DROWNED, test),
					DROWNED,
				),
			),
		);
	}

	/** Calls made through one of these names, like `it.only(...)` through `it`, in order. */
	private calls(file: SourceFile, names: Set<string>): SyntaxNode[] {
		return file.ts
			.findAll({ rule: { kind: "call_expression" } })
			.filter(
				(call) =>
					names.has(callee(call)) && !call.parent()?.is("call_expression"),
			);
	}
}

/**
 * What a title opens on, when it is not plainly a verb: an action, a gerund
 * or a condition, which "it" cannot precede, or a name from the code, which
 * may still be a verb like "URL-encodes".
 */
function opensOn(title: string): "action" | "name" | undefined {
	const first = title.trim().split(/\s+/)[0] ?? "";
	if (/ing$/i.test(first) || CONDITIONS.has(first.toLowerCase())) {
		return "action";
	}
	return /[A-Z_.()]/.test(first.slice(1)) ? "name" : undefined;
}

/** The declarations a test makes itself before its first `expect`. */
function setup(test: SyntaxNode): SyntaxNode[] {
	const statements = test.field("body")?.children() ?? [];
	const first = statements.findIndex(
		(statement) =>
			statement.findAll({
				rule: {
					kind: "call_expression",
					has: { field: "function", regex: "^expect$" },
				},
			}).length > 0,
	);
	return statements
		.slice(0, first === -1 ? undefined : first)
		.filter((statement) =>
			statement.is("lexical_declaration", "variable_declaration"),
		);
}

/**
 * The name a call is made through, down to its root: `it` for `it(...)`,
 * `it.only(...)` and `it.each(cases)(...)`.
 */
function callee(call: SyntaxNode): string {
	let target = call.field("function");
	while (target?.is("member_expression", "call_expression")) {
		target = target.is("member_expression")
			? target.field("object")
			: target.field("function");
	}
	return target?.is("identifier") ? target.text : "";
}
