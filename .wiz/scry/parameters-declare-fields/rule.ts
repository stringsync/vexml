import type { Finding, Rule, SourceFile, SyntaxNode } from "@webappwiz/scry";

/** A parameter that already declares a field. */
const MODIFIER = /^(private|protected|public|readonly|override)\b/;

/** `this.name = name;`, and nothing else. */
const COPY = /^this\.(?<field>[\w$]+)\s*=\s*(?<value>[\w$]+);?$/;

/**
 * Finds a constructor copying a parameter straight into the field of the
 * same name, at the top of its body.
 */
export default class ParametersDeclareFields implements Rule {
	static readonly description =
		"A constructor parameter copied straight into a field of the same name carries the modifier instead.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	async check(file: SourceFile): Promise<Finding[]> {
		return this.constructors(file).flatMap((maker) =>
			this.copiesAtTheTop(maker).map((copy) =>
				copy.flag(
					`Put the modifier on the ${COPY.exec(copy.text)?.groups?.field} parameter, and drop this line and the field it fills.`,
				),
			),
		);
	}

	private constructors(file: SourceFile): SyntaxNode[] {
		return file.ts
			.findAll({ rule: { kind: "method_definition" } })
			.filter((method) => method.field("name")?.text === "constructor");
	}

	/**
	 * The leading `this.x = x` statements, after a `super()`. The first
	 * statement that is anything else ends them: what follows is the
	 * constructor deciding something.
	 */
	private copiesAtTheTop(maker: SyntaxNode): SyntaxNode[] {
		const plain = this.plainParameters(maker);
		const copies: SyntaxNode[] = [];
		for (const statement of maker.field("body")?.children() ?? []) {
			if (statement.text.startsWith("super(")) {
				continue;
			}
			const copy = COPY.exec(statement.text)?.groups;
			if (
				copy === undefined ||
				copy.field !== copy.value ||
				!plain.has(copy.value ?? "")
			) {
				break;
			}
			copies.push(statement);
		}
		return copies;
	}

	/** The names of the parameters that do not declare a field already. */
	private plainParameters(maker: SyntaxNode): Set<string> {
		return new Set(
			(maker.field("parameters")?.children() ?? [])
				.filter((parameter) => !MODIFIER.test(parameter.text))
				.map((parameter) => parameter.field("pattern"))
				.filter((pattern) => pattern?.is("identifier"))
				.map((pattern) => pattern?.text ?? ""),
		);
	}
}
