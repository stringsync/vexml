import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/** Types the language provides, which are values a function works on, never a dependency. */
const BUILTINS = new Set([
	"Array",
	"Date",
	"Error",
	"Map",
	"Promise",
	"ReadonlyArray",
	"Record",
	"RegExp",
	"Set",
	"URL",
]);

/** What an exported `const` holds when it is a function. */
const FUNCTION_VALUES = ["arrow_function", "function_expression"];

/**
 * Finds exported functions that each take the same dependency, a cli action
 * wrapped in a class built only to be called once, and a constructor naming
 * one implementation of a dependency that has several.
 */
export default class ClassesOverFunctionExports implements Rule {
	static readonly description =
		"A file's dependency-taking functions become one class that takes them once.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private decider: Decider;

	constructor(tools: Tools) {
		this.decider = tools.decider;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return [
			...(await this.functionsSharingADependency(file)),
			...this.actionsWrappedInAClass(file),
			...(await this.oneImplementationNamed(file)),
		].toSorted((left, right) => left.line - right.line);
	}

	/**
	 * Two or more exported functions taking a parameter of the same type, and
	 * calling a method on it in at least one: a decider tells a service they
	 * share from data they all work on.
	 */
	private async functionsSharingADependency(
		file: SourceFile,
	): Promise<Finding[]> {
		const byType = new Map<string, Taker[]>();
		for (const exported of this.exportedFunctions(file)) {
			for (const parameter of parametersOf(exported.node)) {
				const type = typeName(parameter);
				if (type !== "" && !BUILTINS.has(type)) {
					byType.set(type, [
						...(byType.get(type) ?? []),
						{ ...exported, parameter: nameOf(parameter) },
					]);
				}
			}
		}
		const shared = [...byType].filter(
			([, takers]) =>
				takers.length >= 2 &&
				takers.some((taker) => callsOn(taker.node, taker.parameter)),
		);
		return Promise.all(
			shared.map(async ([type, takers]) => {
				const question = `Is ${type} a service these functions call, like a database, store, clock or client, rather than data they read or build?`;
				const first = takers[0] as Taker;
				return first.span.flag(
					`${list(takers.map((taker) => taker.name))} each take a ${type}: make them methods of one class that takes it in its constructor.`,
					await this.decider.decide(question, first.span),
					question,
				);
			}),
		);
	}

	/**
	 * `.action((opts, deps) => new Fix(deps).run(opts))`: a class built in the
	 * handler handed to `action` and dropped after one call, where the action
	 * should be a function. What builds the command itself is not the action.
	 */
	private actionsWrappedInAClass(file: SourceFile): Finding[] {
		const classes = file.ts.topLevelClasses();
		return file.ts
			.findAll({
				rule: {
					kind: "call_expression",
					has: {
						field: "function",
						kind: "member_expression",
						has: { field: "property", regex: "^action$" },
					},
				},
			})
			.flatMap(
				(action) =>
					action.field("arguments")?.findAll({
						rule: {
							kind: "call_expression",
							has: {
								field: "function",
								kind: "member_expression",
								has: { field: "object", kind: "new_expression" },
							},
						},
					}) ?? [],
			)
			.map((call) => {
				const name =
					call.field("function")?.field("object")?.field("constructor")?.text ??
					"it";
				const declared = classes.find((each) => each.name === name);
				return (declared ?? call).flag(
					`${name} is a cli action built only to be called once: make it a function taking its dependencies in its options.`,
				);
			});
	}

	/**
	 * A constructor parameter typed `NodeFs` in a file that names `Fs`: a
	 * decider tells one implementation of an interface from a class that is
	 * the only one.
	 */
	private async oneImplementationNamed(file: SourceFile): Promise<Finding[]> {
		const candidates = file.ts
			.findAll({
				rule: {
					kind: "method_definition",
					has: { field: "name", regex: "^constructor$" },
				},
			})
			.flatMap((setup) => parametersOf(setup))
			.flatMap((parameter) => {
				const type = typeName(parameter);
				const wider = widerNames(type).find((name) =>
					new RegExp(`\\b${name}\\b`).test(
						file.text.replace(new RegExp(`\\b${type}\\b`, "g"), ""),
					),
				);
				return wider === undefined ? [] : [{ parameter, type, wider }];
			});
		return Promise.all(
			candidates.map(async ({ parameter, type, wider }) => {
				const question = `Is ${type} one implementation of ${wider}, which has others, such as a fake for tests?`;
				return parameter.flag(
					`Type ${nameOf(parameter)} as ${wider}, not ${type}, so a test can hand in another implementation.`,
					await this.decider.decide(question, parameter),
					question,
				);
			}),
		);
	}

	/** Each exported function, declared or held in a `const`, with its name and where it starts. */
	private exportedFunctions(file: SourceFile): Exported[] {
		return file.ts
			.topLevel()
			.filter((statement) => statement.parent()?.is("export_statement"))
			.flatMap((statement) => {
				if (statement.is("function_declaration")) {
					return [
						{
							name: statement.field("name")?.text ?? "it",
							node: statement,
							span: statement,
						},
					];
				}
				if (!statement.is("lexical_declaration")) {
					return [];
				}
				return statement
					.children()
					.filter((declarator) =>
						FUNCTION_VALUES.includes(declarator.field("value")?.kind ?? ""),
					)
					.map((declarator) => ({
						name: declarator.field("name")?.text ?? "it",
						node: declarator.field("value") as SyntaxNode,
						span: statement,
					}));
			});
	}
}

/** An exported function: `node` holds its parameters, `span` is where a finding points. */
interface Exported {
	name: string;
	node: SyntaxNode;
	span: SyntaxNode;
}

/** An exported function, and the name it gives a parameter of the shared type. */
interface Taker extends Exported {
	parameter: string;
}

function parametersOf(owner: SyntaxNode): SyntaxNode[] {
	return (
		owner
			.field("parameters")
			?.children()
			.filter((parameter) =>
				parameter.is("required_parameter", "optional_parameter"),
			) ?? []
	);
}

function nameOf(parameter: SyntaxNode): string {
	return parameter.field("pattern")?.text ?? parameter.text;
}

/** A parameter's type by name, `Clock`; empty when it is anything else. */
function typeName(parameter: SyntaxNode): string {
	const type = parameter.field("type")?.children()[0];
	return type?.is("type_identifier") ? type.text : "";
}

/** Whether a function calls a method on the parameter it names so: `clock.now()`. */
function callsOn(owner: SyntaxNode, parameter: string): boolean {
	return (
		owner.findAll({
			rule: {
				kind: "call_expression",
				has: {
					field: "function",
					kind: "member_expression",
					has: { field: "object", regex: `^${parameter}$` },
				},
			},
		}).length > 0
	);
}

/** The names a type's name ends in, widest last: `Fs` for `NodeFs`, `Logger` for `ConsoleLogger`. */
function widerNames(type: string): string[] {
	const words = type.match(/[A-Z][a-z0-9]*/g) ?? [];
	const names: string[] = [];
	for (let i = 1; i < words.length; i++) {
		names.push(words.slice(i).join(""));
	}
	return names;
}

/** `a`, `a and b`, `a, b and c`. */
function list(names: string[]): string {
	return names.length < 2
		? (names[0] ?? "")
		: `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
