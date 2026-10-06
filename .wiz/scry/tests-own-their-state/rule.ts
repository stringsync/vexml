import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/** Calls that change a collection in place. */
const MUTATORS = new Set([
	"push",
	"pop",
	"shift",
	"unshift",
	"splice",
	"set",
	"add",
	"delete",
	"clear",
]);

/** Values that are data rather than a setting: a list, a record, a built object. */
const DATA = ["array", "object", "new_expression"];

const HARNESS =
	"Does this class keep the code under test in a field and fill it with data, so a test's starting state is hidden in the class?";

/**
 * Finds shared setup that owns state: a helper keeping state between calls,
 * a `testing` file holding data, a `beforeEach` building what at most one
 * test uses, and a harness class holding the world.
 */
export default class TestsOwnTheirState implements Rule {
	static readonly description =
		"Tests set up their own state; shared setup only names steps and never builds the world.";
	static readonly files = "**/{*.test,testing}.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return [
			...this.stateKeptBetweenCalls(file),
			...this.dataInSharedSetup(file),
			...this.setupOnlyOneTestUses(file),
			...(await this.harnesses(file)),
		].toSorted((left, right) => left.line - right.line);
	}

	/** A top-level variable a function at the top of the file changes. */
	private stateKeptBetweenCalls(file: SourceFile): Finding[] {
		const helpers = file.ts
			.topLevel()
			.filter((statement) => isFunction(statement));
		return this.topLevelVariables(file)
			.filter(({ name }) => helpers.some((helper) => changes(helper, name)))
			.map(({ declaration, name }) =>
				declaration.flag(
					`A helper keeps ${name} between calls: have each test make its own, or pass it in.`,
				),
			);
	}

	/** A `testing` file's lists, records and objects: the data its tests should hold. */
	private dataInSharedSetup(file: SourceFile): Finding[] {
		if (file.stem !== "testing") {
			return [];
		}
		return this.topLevelVariables(file)
			.filter(({ value }) => value !== undefined && DATA.includes(value.kind))
			.map(({ declaration, name }) =>
				declaration.flag(
					`Shared setup holds ${name}: let each test pass in the data it is about.`,
				),
			);
	}

	/**
	 * What a `beforeEach` assigns that no test, or only one, reads. A test
	 * reads what it names, what a helper it calls names, and whatever the
	 * `beforeEach` built from it; an `afterEach` cleaning it up makes it
	 * every test's.
	 */
	private setupOnlyOneTestUses(file: SourceFile): Finding[] {
		const tests = file.ts.tests();
		const helpers = this.helpers(file);
		return this.hooks(file, "beforeEach").flatMap((setup) => {
			const scope =
				setup.ancestors().find((node) => isFunction(node)) ?? file.ts.root;
			const inScope = (node: SyntaxNode) =>
				node.line >= scope.line && node.end <= scope.end;
			const scene: Scene = {
				tests: tests.filter(inScope),
				cleanups: this.hooks(file, "afterEach").filter(inScope),
				assignments: this.assignments(setup),
				helpers,
			};
			return scene.assignments.flatMap((assignment) => {
				const name = assignment.field("left")?.text ?? "";
				if (
					scene.cleanups.some((cleanup) => mentions(cleanup, name, helpers))
				) {
					return [];
				}
				const readers = this.readers(name, scene, new Set([name])).size;
				if (readers >= 2 || (readers === 1 && scene.tests.length < 2)) {
					return [];
				}
				return [
					assignment.flag(
						readers === 0
							? `No test here reads ${name}: drop it from beforeEach.`
							: `Only one test reads ${name}: build it in that test.`,
					),
				];
			});
		});
	}

	/** The lines of the tests that read `name`, or read what was built from it. */
	private readers(name: string, scene: Scene, seen: Set<string>): Set<number> {
		const lines = new Set(
			scene.tests
				.filter((test) => mentions(test, name, scene.helpers))
				.map((test) => test.line),
		);
		for (const assignment of scene.assignments) {
			const built = assignment.field("left")?.text ?? "";
			const from = assignment.field("right");
			if (
				!seen.has(built) &&
				from !== undefined &&
				mentions(from, name, scene.helpers)
			) {
				seen.add(built);
				for (const line of this.readers(built, scene, seen)) {
					lines.add(line);
				}
			}
		}
		return lines;
	}

	/** `x = ...` in a hook, where `x` is a plain name. */
	private assignments(setup: SyntaxNode): SyntaxNode[] {
		return setup.findAll({
			rule: {
				kind: "assignment_expression",
				has: { field: "left", kind: "identifier" },
			},
		});
	}

	/**
	 * Everything in the file with a name and a value, by that name: a
	 * function a test calls, or a fake object whose methods read setup.
	 */
	private helpers(file: SourceFile): Map<string, SyntaxNode> {
		const named = [
			...file.ts
				.findAll({ rule: { kind: "function_declaration" } })
				.map((helper) => ({
					name: helper.field("name")?.text,
					body: helper,
				})),
			...file.ts
				.findAll({ rule: { kind: "variable_declarator" } })
				.map((declarator) => ({
					name: declarator.field("name")?.text,
					body: declarator.field("value"),
				})),
		];
		return new Map(
			named
				.filter(({ body }) => body !== undefined)
				.map(({ name, body }) => [name ?? "", body as SyntaxNode]),
		);
	}

	/** Classes whose fields build objects, which the som tells apart from fakes. */
	private async harnesses(file: SourceFile): Promise<Finding[]> {
		const candidates = file.ts.topLevel().filter(
			(statement) =>
				statement.is("class_declaration") &&
				statement.findAll({
					rule: {
						kind: "public_field_definition",
						has: { field: "value", kind: "new_expression" },
					},
				}).length > 0,
		);
		return Promise.all(
			candidates.map(async (harness) =>
				harness.flag(
					`${harness.field("name")?.text} owns the state the tests are about: build it in each test, or in a beforeEach.`,
					await this.som.decide(HARNESS, harness),
					HARNESS,
				),
			),
		);
	}

	/** The functions handed to `beforeEach`, or to `afterEach`. */
	private hooks(
		file: SourceFile,
		hook: "beforeEach" | "afterEach",
	): SyntaxNode[] {
		return file.ts
			.findAll({
				rule: {
					kind: "call_expression",
					has: { field: "function", regex: `^${hook}$` },
				},
			})
			.flatMap(
				(call) =>
					call
						.field("arguments")
						?.children()
						.filter((argument) => isFunction(argument)) ?? [],
			);
	}

	/** Each `let`, `const` and `var` at the top of the file, by name. */
	private topLevelVariables(
		file: SourceFile,
	): { declaration: SyntaxNode; name: string; value?: SyntaxNode }[] {
		return file.ts
			.topLevel()
			.filter((statement) =>
				statement.is("lexical_declaration", "variable_declaration"),
			)
			.flatMap((declaration) =>
				declaration
					.children()
					.filter((declarator) => declarator.is("variable_declarator"))
					.map((declarator) => ({
						declaration,
						name: declarator.field("name")?.text ?? "",
						value: declarator.field("value"),
					})),
			);
	}
}

function isFunction(node: SyntaxNode): boolean {
	return node.is(
		"function_declaration",
		"arrow_function",
		"function_expression",
	);
}

/** Whether `node` assigns `name`, steps it, or changes it in place. */
function changes(node: SyntaxNode, name: string): boolean {
	return (
		node
			.findAll({
				rule: {
					any: [
						{ kind: "assignment_expression" },
						{ kind: "augmented_assignment_expression" },
					],
				},
			})
			.some((assignment) => assignment.field("left")?.text === name) ||
		node
			.findAll({ rule: { kind: "update_expression" } })
			.some((step) => step.text.replace(/\+\+|--/g, "") === name) ||
		node
			.findAll({
				rule: {
					kind: "call_expression",
					has: { field: "function", kind: "member_expression" },
				},
			})
			.some((call) => {
				const method = call.field("function");
				return (
					method?.field("object")?.text === name &&
					MUTATORS.has(method.field("property")?.text ?? "")
				);
			})
	);
}

/** A `beforeEach`, and what around it can read what it builds. */
interface Scene {
	tests: SyntaxNode[];
	cleanups: SyntaxNode[];
	assignments: SyntaxNode[];
	helpers: Map<string, SyntaxNode>;
}

/** Whether `node` names `name`, or calls a helper that does. */
function mentions(
	node: SyntaxNode,
	name: string,
	helpers: Map<string, SyntaxNode>,
	seen = new Set<string>(),
): boolean {
	// `{ log }` reads `log` as surely as `log` does
	const identifiers = node
		.findAll({
			rule: {
				any: [
					{ kind: "identifier" },
					{ kind: "shorthand_property_identifier" },
				],
			},
		})
		.map((identifier) => identifier.text);
	if (identifiers.includes(name)) {
		return true;
	}
	return identifiers.some((called) => {
		const helper = helpers.get(called);
		if (helper === undefined || seen.has(called)) {
			return false;
		}
		seen.add(called);
		return mentions(helper, name, helpers, seen);
	});
}
