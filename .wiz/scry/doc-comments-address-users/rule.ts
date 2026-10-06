import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/** A note left for whoever works on the code next. */
const TODO = /\b(TODO|FIXME|HACK|XXX)\b/;

/** The tag that marks a doc comment as written for maintainers. */
const INTERNAL = /(^|\s)@internal\b/;

/** Class and interface members a user can reach. */
const MEMBERS = [
	"method_definition",
	"public_field_definition",
	"method_signature",
	"property_signature",
];

const FOR_MAINTAINERS =
	"Does this doc comment hold notes for the code's maintainers, such as how it is implemented, its history, or what to change later, that a user calling it does not need?";

/**
 * Finds doc comments on exports that speak to maintainers rather than users.
 * A TODO is plainly a maintainer's; the som tells whether the rest of a
 * doc comment is about how the code is built. One tagged `@internal` is for
 * maintainers by design, and left alone.
 */
export default class DocCommentsAddressUsers implements Rule {
	static readonly description =
		"A doc comment on an export tells users what it is for, not maintainers how it is built.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		const docs = this.onExports(file);
		return [
			...this.todos(docs),
			...(await this.forMaintainers(
				docs.filter((doc) => !TODO.test(doc.text)),
			)),
		].toSorted((left, right) => left.line - right.line);
	}

	/** A TODO in a doc comment on an export. */
	private todos(docs: SyntaxNode[]): Finding[] {
		return docs
			.filter((doc) => TODO.test(doc.text))
			.map((doc) =>
				doc.flag(
					"Users read this doc comment: move the TODO into the body as a regular comment.",
				),
			);
	}

	/** A doc comment on an export that the som reads as written for maintainers. */
	private async forMaintainers(docs: SyntaxNode[]): Promise<Finding[]> {
		return Promise.all(
			docs.map(async (doc) =>
				doc.flag(
					"Users read this doc comment: say what it is for and how to use it, and move notes on how it is built into the body.",
					await this.som.decide(FOR_MAINTAINERS, doc),
					FOR_MAINTAINERS,
				),
			),
		);
	}

	/**
	 * Doc comments on what users see: a top-level export, or a member of an
	 * exported class or interface that is not private or protected, unless
	 * the comment is tagged `@internal`.
	 */
	private onExports(file: SourceFile): SyntaxNode[] {
		return file.ts
			.findAll({ rule: { kind: "comment", regex: "^/\\*\\*" } })
			.filter((doc) => {
				const documented = documents(doc);
				return (
					!INTERNAL.test(doc.text) &&
					documented !== undefined &&
					reachable(documented)
				);
			});
	}
}

/** The node right after a comment, which the comment documents. */
function documents(doc: SyntaxNode): SyntaxNode | undefined {
	const siblings = doc.parent()?.children() ?? [];
	const index = siblings.findIndex(
		(sibling) => sibling.is("comment") && sibling.line === doc.line,
	);
	return siblings.slice(index + 1).find((sibling) => !sibling.is("comment"));
}

/** Whether a user of the module can reach a node: it is exported, or a public member of an export. */
function reachable(node: SyntaxNode): boolean {
	if (node.is("export_statement")) {
		return true;
	}
	if (!node.is(...MEMBERS) || hidden(node)) {
		return false;
	}
	const owner = node.parent()?.parent();
	return owner?.parent()?.is("export_statement") === true;
}

/** A `private` or `protected` member, or one named with `#`. */
function hidden(member: SyntaxNode): boolean {
	return (
		member
			.children()
			.some(
				(child) =>
					child.is("accessibility_modifier") && child.text !== "public",
			) || member.field("name")?.is("private_property_identifier") === true
	);
}
