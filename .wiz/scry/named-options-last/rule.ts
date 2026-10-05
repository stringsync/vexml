import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/** What declares a function whose signature its own callers rely on. */
const FUNCTIONS = [
	"function_declaration",
	"generator_function_declaration",
	"method_definition",
	"arrow_function",
	"function_expression",
];

/** How many positional parameters a function takes before settings likely hide among them. */
const CROWDED = 4;

const SETTINGS =
	"Are some of this function's parameters settings, choices a caller could leave to a default (a locale, a flag, a count, a mode), rather than values the call works on?";

/**
 * Finds an options object ahead of other parameters, an options object typed
 * in place or not named `opts`, and settings spread across positional
 * parameters. An options object is `opts`, or a `*Options`; a destructured
 * object or a deps object is something else.
 */
export default class NamedOptionsLast implements Rule {
	static readonly description =
		"Settings go in one named opts object, after the parameters a caller cannot leave out.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "warning";
	static readonly recommended = true;

	private decider: Decider;

	constructor(tools: Tools) {
		this.decider = tools.decider;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		const signatures = this.signatures(file);
		return [
			...signatures.flatMap((parameters) =>
				this.optionalAfterOptions(parameters),
			),
			...signatures.flatMap((parameters) =>
				this.requiredAfterOptions(parameters),
			),
			...signatures.flatMap((parameters) =>
				this.optionsTypedInPlace(parameters),
			),
			...signatures.flatMap((parameters) =>
				this.optionsNotNamedOpts(parameters),
			),
			...(await Promise.all(
				signatures
					.filter((parameters) => this.crowded(parameters))
					.map((parameters) => this.settingsSpreadOut(parameters)),
			)),
		].toSorted((left, right) => left.line - right.line);
	}

	/**
	 * The parameter lists of the file's functions, but those of callbacks,
	 * whose shape the code calling them decides.
	 */
	private signatures(file: SourceFile): SyntaxNode[][] {
		return file.ts
			.findAll({ rule: { kind: "formal_parameters" } })
			.filter((list) => {
				const owner = list.parent();
				return owner?.is(...FUNCTIONS) && !owner?.parent()?.is("arguments");
			})
			.map((list) =>
				list
					.children()
					.filter((parameter) =>
						parameter.is("required_parameter", "optional_parameter"),
					),
			);
	}

	/**
	 * An options object with a parameter after it a caller can leave out,
	 * which the caller reaches by passing `undefined` or `{}`.
	 */
	private optionalAfterOptions(parameters: SyntaxNode[]): Finding[] {
		const index = parameters.findIndex((parameter) => isOptions(parameter));
		const after = parameters
			.slice(index + 1)
			.filter((parameter) => isOptional(parameter));
		if (index === -1 || after.length === 0) {
			return [];
		}
		return [
			(parameters[index] as SyntaxNode).flag(
				`Move ${after.map((parameter) => nameOf(parameter)).join(", ")} into opts: a caller should not pass the options to reach it.`,
			),
		];
	}

	/** An options object ahead of parameters every call passes, which go first. */
	private requiredAfterOptions(parameters: SyntaxNode[]): Finding[] {
		const index = parameters.findIndex((parameter) => isOptions(parameter));
		const after = parameters
			.slice(index + 1)
			.filter((parameter) => !isOptional(parameter));
		if (index === -1 || after.length === 0) {
			return [];
		}
		const options = parameters[index] as SyntaxNode;
		return [
			options.flag(
				`Put ${nameOf(options)} last: move ${after.map((parameter) => nameOf(parameter)).join(", ")} ahead of it.`,
			),
		];
	}

	/** `opts: { encoding?: string }`, a shape no caller can name. */
	private optionsTypedInPlace(parameters: SyntaxNode[]): Finding[] {
		return parameters
			.filter(
				(parameter) =>
					isNamedOptions(parameter) && typeOf(parameter)?.is("object_type"),
			)
			.map((parameter) =>
				parameter.flag(
					`Name the type of ${nameOf(parameter)}: declare an interface for it beside the function, after what it configures.`,
				),
			);
	}

	/** `options: WriteOptions`, where the convention is `opts`. */
	private optionsNotNamedOpts(parameters: SyntaxNode[]): Finding[] {
		return parameters
			.filter(
				(parameter) =>
					typeName(parameter).endsWith("Options") &&
					parameter.field("pattern")?.is("identifier") &&
					nameOf(parameter) !== "opts",
			)
			.map((parameter) =>
				parameter.flag(`Name ${nameOf(parameter)} \`opts\`.`),
			);
	}

	/**
	 * Enough plain positional parameters, besides the options, that settings
	 * may be among them. An object taken apart in place is one argument, not a
	 * row of settings.
	 */
	private crowded(parameters: SyntaxNode[]): boolean {
		return (
			parameters.filter(
				(parameter) =>
					!isOptions(parameter) && parameter.field("pattern")?.is("identifier"),
			).length >= CROWDED
		);
	}

	/** Settings among the positional parameters, which a decider tells apart from values the call needs. */
	private async settingsSpreadOut(parameters: SyntaxNode[]): Promise<Finding> {
		const owner = (parameters[0] as SyntaxNode).parent()?.parent();
		const span = owner ?? (parameters[0] as SyntaxNode);
		return span.flag(
			`Gather the settings among ${parameters.map((parameter) => nameOf(parameter)).join(", ")} into one named opts object, last.`,
			await this.decider.decide(SETTINGS, span),
			SETTINGS,
		);
	}
}

/** Whether a parameter is the options object: named `opts` or `options`, or typed `*Options`. */
function isOptions(parameter: SyntaxNode): boolean {
	return isNamedOptions(parameter) || typeName(parameter).endsWith("Options");
}

/** `opts` or `options`, by itself rather than taken apart. */
function isNamedOptions(parameter: SyntaxNode): boolean {
	return ["opts", "options"].includes(nameOf(parameter));
}

/** `fs?: Fs`, or `count = 1`: a parameter a caller can leave out. */
function isOptional(parameter: SyntaxNode): boolean {
	return (
		parameter.is("optional_parameter") || parameter.field("value") !== undefined
	);
}

function nameOf(parameter: SyntaxNode): string {
	return parameter.field("pattern")?.text ?? parameter.text;
}

/** What a parameter is annotated with, past the colon. */
function typeOf(parameter: SyntaxNode): SyntaxNode | undefined {
	return parameter.field("type")?.children()[0];
}

/** A parameter's type by name, `WriteOptions`; empty when it has none. */
function typeName(parameter: SyntaxNode): string {
	const type = typeOf(parameter);
	return type?.is("type_identifier") ? type.text : "";
}
