import {
	type Comment,
	type Decider,
	type Finding,
	type Rule,
	type SourceFile,
	Span,
	type Tools,
} from "@webappwiz/scry";

/** Comments written for a tool rather than a reader: lint and compiler directives. */
const DIRECTIVE =
	/^\/[/*]\s*(@ts-|biome-ignore|eslint-|prettier-ignore|istanbul |c8 |#region|#endregion|@vite-ignore|webpackChunkName)/;

const RESTATES =
	"Does this comment only restate what the code below it plainly does?";

/**
 * Finds comments that say what the code does rather than why it is so. Code
 * picks out the comments written for a reader; the som tells whether one
 * only restates its code.
 */
export default class CommentsSayWhyNotWhat implements Rule {
	static readonly description =
		"A comment explains why the code is as it is, never what it plainly does.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return Promise.all(
			this.forReaders(file).map(async (comment) =>
				comment.flag(
					"This comment says what the code does: drop it, or say why the code is so.",
					await this.som.decide(RESTATES, comment),
					RESTATES,
				),
			),
		);
	}

	/**
	 * Comments that are not doc comments or tool directives, with a run of
	 * `//` lines read as the one comment it is.
	 */
	private forReaders(file: SourceFile): Span[] {
		return paragraphs(
			file,
			file.ts
				.comments()
				.filter((comment) => !comment.doc && !DIRECTIVE.test(comment.text)),
		);
	}
}

/** Line comments on consecutive lines, joined into one span; the rest as they are. */
function paragraphs(file: SourceFile, comments: Comment[]): Span[] {
	const runs: Comment[][] = [];
	for (const comment of comments) {
		const run = runs.at(-1);
		const last = run?.at(-1);
		if (
			run !== undefined &&
			last !== undefined &&
			comment.line === last.line + 1 &&
			startsItsLine(file, comment) &&
			startsItsLine(file, last)
		) {
			run.push(comment);
		} else {
			runs.push([comment]);
		}
	}
	return runs.map((run) =>
		run.length === 1
			? (run[0] as Comment)
			: new Span(
					file,
					(run[0] as Comment).line,
					run.map((comment) => comment.text).join("\n"),
				),
	);
}

/** Whether a `//` comment is alone on its line, not trailing code. */
function startsItsLine(file: SourceFile, comment: Comment): boolean {
	return (
		comment.text.startsWith("//") &&
		file.lines[comment.line - 1]?.trimStart().startsWith("//") === true
	);
}
