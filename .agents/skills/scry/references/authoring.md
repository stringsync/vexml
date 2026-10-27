# Writing a scry rule

How to add or update a rule in `.wiz/scry`. The skill's `SKILL.md` covers
checking, fixing, credentials and budgets.

## The rule's parts

The directory's name, in kebab case, is the rule's id. Its settings are
static members of the class `rule.ts` default-exports (see The check):

- `description`: one line. Required.
- `files`: a glob of the files it applies to. Every file when absent.
- `level`: `error` or `warning`. `error` when absent.
- `threshold`: how sure a check has to be before a finding is reported,
  from 0 to 1. 0.7 when absent. Code is sure, so only what a model decided
  is ever under it; raise it for a rule that reports too much, lower it for
  one that misses.
- `options`: what a project can tune, by name, each with its default, like
  `{ limit: 500 }`, a string, number or boolean. The constructor gets them
  after its tools, with what the project sets under `scry.rules.<id>` laid
  over the defaults. Give a rule one only for a number or choice projects
  reasonably differ on, and keep its id, `description` and messages free of
  the default, which a project may change.

`wiz scry list` loads every rule's class and names each one missing a
`rule.ts` or a `description`, or giving a bad setting.

`RULE.md` is for whoever fixes a finding, person or agent: what counts, what
does not, and why, plainly, with a short example when one helps. Nothing
reads it but people and agents. A rule copied from the catalog keeps a
`version:` in its frontmatter, which says which release it came from.
Anything longer the rule points to goes in an optional `references/`.

## Adding a rule

1. Find out what the rule wants: what counts, what does not, and an example
   of each. Ask for what the user has not said.
2. **Check whether the project's own tooling can enforce it** before writing
   anything. Find out what the project actually runs, from its manifests and
   lockfiles, its linter, formatter, and compiler configuration, its
   pre-commit hooks, its CI workflows, and its own check scripts, and
   consider only those tools. When one of them can express the rule, say so,
   show the configuration you would add, and ask whether to do that instead
   of the rule, or as well. When nothing the project runs fits, say so, and
   do not propose adopting a new tool unless asked.
3. When a shipped rule covers it, `wiz scry add <id>` copies it in, and it can
   be edited from there. Otherwise make `.wiz/scry/<id>`, with an id that
   says what the rule wants, and write its `RULE.md`.
4. Write its labeled cases (see Cases).
5. Write its `rule.ts` (see The check) and its `rule.test.ts` (see Tests).
6. Run `wiz scry list`, then `wiz scry test <id>`, then `wiz scry eval <id>`,
   and fix what they report.

## Updating a rule

Edit it, and check the project's tooling again when what it asks changes.
Keep its settings, cases, check and tests in step with its prose, and run
`wiz scry test <id>` and `wiz scry eval <id>` after. A rule copied from
the catalog takes local edits, but `wiz scry update` overwrites them; say so
before editing one that carries a `version`, and offer to drop that line so
the copy becomes the project's own.

## Cases

A rule's `evals/` holds cases whose answer is known, the way tests sit
beside code. `<name>.good.<ext>` is a file that should not be found to
break the rule; `<name>.bad.<ext>` is one that should. The rule reads it as
`<name>.<ext>`, so `cart.test.bad.ts` is a `cart.test.ts` that breaks it.
Write a few of each for every rule:

- Name a case for what the code is (`invoice-parser.ts`,
  `cart-totals.test.ts`), never for the verdict or the rule.
- Make them different from any example in its `RULE.md`.
- Bad cases break the rule plainly, by its own wording, one way each. Good
  cases include a near miss the rule's wording excuses, and one the rule
  does not apply to.
- No comment says which a case is.

A check never checks them. When `wiz scry eval` gets one wrong, change
the rule's check, question or `threshold`, not the case, unless the case was
wrong by the rule's own wording.

## The check

`rule.ts` default-exports a class implementing `Rule`, built with `Tools`.
Its static members are the rule's settings, and its `check(file)` reads one
`SourceFile` and returns a finding for each place the file breaks the rule:

```ts
import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	Tools,
} from "@webappwiz/scry";

const RESTATES =
	"Does this comment only restate what the code under it does, rather than say why?";

/** Finds comments that say what the code does instead of why. */
export default class CommentsSayWhy implements Rule {
	static readonly description =
		"A comment explains why the code is as it is, never what it plainly does.";
	static readonly files = "**/*.ts";
	static readonly level = "warning";

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return Promise.all(
			this.lineComments(file).map(async (comment) =>
				comment.flag(
					"Say why, not what.",
					await this.som.decide(RESTATES, comment),
					RESTATES,
				),
			),
		);
	}

	/** Comments that are not doc comments: those are another rule's. */
	private lineComments(file: SourceFile) {
		return file.ts.comments().filter((comment) => !comment.doc);
	}
}
```

- **Code first.** Settle everything a program can: which nodes to look at,
  what is excused, what plainly matches. A finding code decides is
  `span.flag(message)`, sure at 100%, and costs nothing.
- **The som for judgment only.** What takes reading, like whether a
  comment says why, goes to `som.decide(question, span)` as one
  yes-or-no question about the narrowest span that holds the answer. It
  returns the probability of yes, which becomes the finding's confidence:
  `span.flag(message, probability, question)`. Ask it after code has
  narrowed the candidates, never about every line.
- **The llm as a last resort.** `tools.llm` answers the same
  `decide(question, span)`, but reasons first, slower and dearer. Reach
  for it only when `wiz scry eval` shows the som still wrong after
  narrowing the span and rewording the question, and only for the
  question it gets wrong: the rest stay with the som. A rule that
  asks it says so in its `rule.ts`, with the eval that showed the som
  missing. Its probability is one it states, not one read off its tokens,
  so evaluate before trusting the default `threshold`.
- **Let a model's errors through.** Never catch what `decide` throws:
  when a model is turned off with `--disable` or its budget runs out, it
  throws `Unasked`, which the engine reports as that rule unchecked on
  that file, with why. A rule that catches it and returns no findings
  reports the file clean when nothing was asked.
- **An effort for how hard a question is.**
  `decide(question, span, { effort: "high" })` asks the model the config
  names for `low`, `medium` or `high`; a question that names none asks the
  default's. Name one only when `wiz scry eval` shows the default's model
  wrong on that question (`high`) or a cheaper one right (`low`): which
  model each effort asks is the config's, never the rule's.
- **Private methods named for the rule's sentences**, so `check` reads as
  the rule does: `stateKeptBetweenCalls`, `namedForTheFile`.
- **Import only types** from `@webappwiz/scry`, with `import type`, so the
  check runs wherever the CLI does.
- Leave out what the engine does: matching `files`, the threshold,
  `scry-ignore` comments, and the report.

The toolkit, on `SourceFile` and the spans it returns (`file.ts.comments()`,
`file.ts.findAll(matcher)` with an ast-grep pattern, and the rest), is in the
package README, `node_modules/@webappwiz/scry/README.md`. Read it before
writing a check.

**Every new or changed `rule.ts` needs the user's approval before it is
saved.** Show the whole file, or the whole diff, and say plainly that it
runs on every future `wiz scry`, on whatever machine runs one, so it
deserves the same line-by-line reading as any code about to execute.
Strongly encourage them to read it, then wait for a yes.

## Tests

`rule.test.ts` runs the check on every labeled case, then pins what is
subtler by hand:

```ts
import { describe, expect, it } from "bun:test";
import { Cases, SourceFile } from "@webappwiz/scry";
import { FakeDecider } from "@webappwiz/scry/testing";
import CommentsSayWhy from "./rule";

const cases = await Cases.load(import.meta.dir);

describe("comments-say-why", () => {
	it.each(cases.bad)("flags $name", async ({ file }) => {
		const rule = new CommentsSayWhy({
			som: new FakeDecider({}, 0.9),
			llm: new FakeDecider(),
		});
		expect(await rule.check(file)).not.toEqual([]);
	});

	it("asks about line comments, and not doc comments", async () => {
		const som = new FakeDecider({ "add one": 0.95 });
		const file = new SourceFile("a.ts", "/** A counter. */\n// add one\ni++;\n");

		const findings = await new CommentsSayWhy({
			som,
			llm: new FakeDecider(),
		}).check(file);

		expect(findings.map((finding) => finding.line)).toEqual([2]);
	});
});
```

`Cases.load(import.meta.dir)` reads the rule's `evals/`. `FakeDecider(answers, otherwise)` answers with the
probability under the first key the span's text contains, else
`otherwise`, and keeps what it was `asked`. A fake tests the rule's code;
`wiz scry eval` tests its questions against the real model.

The tests import `@webappwiz/scry`, so the project lists it as a
devDependency (`bun add -d @webappwiz/scry`); `wiz scry add` says so when it
does not. `wiz scry test [ids]` runs the tests. `wiz scry eval [ids]` runs each
rule on its cases with the configured model and prints how many it got
right, then each case it missed or falsely flagged. Tune a question's
wording or a threshold there: change one thing, evaluate again.
