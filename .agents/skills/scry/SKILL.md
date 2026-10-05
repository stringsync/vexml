---
name: scry
description: "Write, update, and remove the scry rules in this project's .wiz/scry, which `wiz scry` checks a change against like a linter. Use when the user explicitly asks for a rule, or asks for a style or convention change across the codebase that a rule could enforce from now on (\"stop using default exports\", \"comments should say why\"). Also use when asked to scry a change or run `wiz scry`."
version: 0.0.36
---

# Scry

`wiz scry` checks a change against the project's rules. A rule is a
directory under `.wiz/scry`, tracked with the code it governs:

```
.wiz/scry/<id>/
├── rule.ts        # required: the check and its settings, asking a decision model only what code cannot
├── RULE.md        # what the rule wants, and why, in prose
├── rule.test.ts   # its tests, on its labeled cases
├── evals/         # labeled cases: files that follow the rule, and files that break it
└── references/    # optional: anything longer the rule points to
```

The directory's name, in kebab case, is the rule's id. Its settings are
static members of the class `rule.ts` default-exports (see The check):

- `description`: one line. Required.
- `files`: a glob of the files it applies to. Every file when absent.
- `level`: `error` or `warning`. `error` when absent.
- `threshold`: how sure a check has to be before a finding is reported,
  from 0 to 1. 0.7 when absent. Code is sure, so only what a decision model
  decided is ever under it; raise it for a rule that reports too much, lower
  it for one that misses.

A directory without a `rule.ts`, or whose class lacks a `description` or
gives a bad setting, is an error: `wiz scry` and `wiz scry list` refuse to
run and name every broken rule at once.

`RULE.md` is for whoever fixes a finding, person or agent: what counts, what
does not, and why, plainly, with a short example when one helps. Nothing
reads it but people and agents; the cases the check is tested and evaluated
on are in `evals/`. A rule copied from the catalog keeps a `version:` in its
frontmatter, which says which release it came from.

Code excuses itself from a rule with a comment holding
`scry-ignore <id>: <reason>`, which covers the statement under it, or
`scry-ignore-file <id>: <reason>`, which covers the whole file. Before scry
these were `rule-ignore` and `rule-ignore-file`; the old spelling still
counts, `wiz scry` names the files that use it, and renaming them is a plain
find and replace. When you touch one of those files, rename its comments.

Run the CLI with `bunx @webappwiz/cli scry`, which checks, or
`bunx @webappwiz/cli scry <command>`: `list`, `add <id>`, `add --recommended`,
`update`, `remove <id>`, `test [ids]`, `eval [ids]`, `why <path:line>`.
`scry --help` says the rest. A project from before scry, with rules in
`.wiz/rules`, moves them with `bunx @webappwiz/cli update`.

## Checking a change

`wiz scry` is a linter: it finds the change with git, runs each rule's
`rule.ts` on the changed files it applies to, and prints one block of
findings, each with how sure the check is: 100% where code decided it, a
decision model's probability where the rule asked one. When the user names
directories or files, pass them, as in `bunx @webappwiz/cli scry
packages/api`, and it checks every file under them, changed or not; add
`--since <ref>` to check only the ones changed since it. When the user names
rules, pass `--rule <id>,<id>` to check with only those.
Show its report as it printed it, in one code block, and add nothing to it.
Fixing what it found is a separate request; do not start unless asked.

## Fixing what it found

The rule decides what is reported; fixing it is yours. For each finding,
read the rule it names, `.wiz/scry/<rule>/RULE.md`, and change the lines it
points at to follow it. Then run `wiz scry` again on the same paths. A
finding under 100% is a model's probability, not a proof: `wiz scry why
<path:line>` shows what it was asked and what it answered. When the code
already follows the rule, leave it, say which finding you left and why, and
offer a `scry-ignore` comment or a higher `threshold` for the rule rather
than working around it.

## Models

A rule asks one of two models: its `decider`, a decision model, or its
`llm`, a language model. The effort a check runs at picks both: `clef-flash`
and `claude-haiku-4-5` at `low`, `clef` and `claude-sonnet-5-5` at `medium`,
the default, `clef` and `claude-opus-5-5` at `high`. `clef` and `clef-flash`
run on Cloudflare Workers AI and need `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN`; a Jev like `jev-latest` runs on TypeSafe and needs
`TYPESAFE_API_KEY`; a Claude like `claude-sonnet-5-5` runs on Anthropic and
needs `ANTHROPIC_API_KEY`. They come from the
environment, else the project's store, else the device's. When `wiz scry` says one is
missing, ask the user to run `bunx @webappwiz/cli creds add <NAME> --device`
themselves, which asks for the value at a hidden prompt and keeps it for
every project on their machine. Never ask for a
value, set one, or look one up; `bunx @webappwiz/cli creds list` shows what
is there without showing any. A rule that asks nothing needs no model and
no credentials, and a model no rule asks needs none either.

The effort and the models each asks are set in `.wiz/config.ts` (the
project's), `~/.config/wiz/config.ts` (the user's own, over the project's),
or `WIZ_SCRY_EFFORT` and `WIZ_SCRY_JOBS` (over both). `--effort <level>`
runs one check at another effort, and `--model <name>` and `--llm <name>`
ask another decider or llm for one run. `--cost` prints only an estimate
of the input tokens a check would spend, without asking a model; run it first
when the user asks what a check costs:

```ts
import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	scry: {
		effort: "medium",
		// over the defaults, only what it names
		models: { high: { llm: "claude-fable-5-1" } },
		jobs: 8, // requests at once, to each model
		exclude: ["vendor/**"], // files no rule checks, from the project root
	},
});
```

Every answer is kept in `node_modules/.cache/webappwiz/scry`, so checking an
unchanged file again asks nothing.

When it refuses a config holding `agents`, `budget`, `batch` or `model`, or
`WIZ_SCRY_MODEL`, those are from before: show the user the message, and with
their yes, replace them with `effort` and the `models` it names.

## When a style change could be a rule

When the user asks for a change across the codebase that should hold from
now on, not just once, offer a rule for it before or alongside making the
change: a rule keeps the next change from undoing it. Making the change now
and adding the rule are two pieces of work; say which you are doing.

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
6. Run `wiz scry list`, which loads every rule's class and names what is
   wrong with its settings, then `wiz scry test <id>`, then `wiz scry eval
   <id>`, and fix what they report.

## Updating a rule

Edit it, and check the project's tooling again when what it asks changes.
Keep its settings, cases, check and tests in step with its prose, and run
`wiz scry test <id>` and `wiz scry eval <id>` after. A rule copied from
the catalog takes local edits, but `wiz scry update` overwrites them; say so
before editing one that carries a `version`, and offer to drop that line so
the copy becomes the project's own.

## Removing a rule

Confirm with the user, then run `wiz scry remove <id>`, which deletes its
directory, check and all.

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

	private decider: Decider;

	constructor(tools: Tools) {
		this.decider = tools.decider;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		return Promise.all(
			this.lineComments(file).map(async (comment) =>
				comment.flag(
					"Say why, not what.",
					await this.decider.decide(RESTATES, comment),
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
- **The decider for judgment only.** What takes reading, like whether a
  comment says why, goes to `decider.decide(question, span)` as one
  yes-or-no question about the narrowest span that holds the answer. It
  returns the probability of yes, which becomes the finding's confidence:
  `span.flag(message, probability, question)`. Ask it after code has
  narrowed the candidates, never about every line.
- **The llm as a last resort.** `tools.llm` answers the same
  `decide(question, span)`, but reasons first, slower and dearer. Reach
  for it only when `wiz scry eval` shows the decider still wrong after
  narrowing the span and rewording the question, and only for the
  question it gets wrong: the rest stay with the decider. A rule that
  asks it says so in its `rule.ts`, with the eval that showed the decider
  missing. Its probability is one it states, not one read off its tokens,
  so evaluate before trusting the default `threshold`.
- **Private methods named for the rule's sentences**, so `check` reads as
  the rule does: `stateKeptBetweenCalls`, `namedForTheFile`.
- **Import only types** from `@webappwiz/scry`, with `import type`, so the
  check runs wherever the CLI does.
- Leave out what the engine does: matching `files`, the threshold,
  `scry-ignore` comments, and the report.

The toolkit, on `SourceFile`: `path`, `text`, `lines`, `stem` (the name up
to its first dot), and `matches(regex)` for text. `file.ts` is the file as
TypeScript: `topLevel()`, `topLevelClasses()`, `comments()`, `tests()` (the
body of each `it` and `test`), and `findAll(matcher)` with an ast-grep
pattern like `this.$FIELD = $VALUE` or a rule like `{ rule: { kind:
"if_statement" } }`. Each returns spans with a `line`, `text` and `flag`;
a `SyntaxNode` also has `kind`, `is(...)`, `field(name)`, `children()`,
`parent()`, `ancestors()`, `captured(name)` and `inside(matcher)`. The
package README has the rest.

**Every new or changed `rule.ts` needs the user's approval before it is
saved.** Show the whole file, or the whole diff, and say plainly that it
runs on every future `wiz scry`, on whatever machine runs one, so it
deserves the same line-by-line reading as any code about to execute.
Strongly encourage them to read it, then wait for a yes. The same goes for
code that arrives from elsewhere: when `wiz scry add` or `wiz scry update`
reports a file, pass its warning on and ask the user to read it before the
next check.

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
			decider: new FakeDecider({}, 0.9),
			llm: new FakeDecider(),
		});
		expect(await rule.check(file)).not.toEqual([]);
	});

	it("asks about line comments, and not doc comments", async () => {
		const decider = new FakeDecider({ "add one": 0.95 });
		const file = new SourceFile("a.ts", "/** A counter. */\n// add one\ni++;\n");

		const findings = await new CommentsSayWhy({
			decider,
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
