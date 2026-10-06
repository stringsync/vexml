---
name: scry
description: "Write, update, and remove the scry rules in this project's .wiz/scry, which `wiz scry` checks code against like a linter. Use when the user explicitly asks for a rule, or asks for a style or convention change across the codebase that a rule could enforce from now on (\"stop using default exports\", \"comments should say why\"). Also use when asked to scry a change or run `wiz scry`."
version: 0.0.38
---

# Scry

`wiz scry` checks code against the project's rules. A rule is a
directory under `.wiz/scry`, tracked with the code it governs:

```
.wiz/scry/<id>/
├── rule.ts        # required: the check and its settings, asking a System One model only what code cannot
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
  from 0 to 1. 0.7 when absent. Code is sure, so only what a System One model
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

`wiz scry` is a linter: it runs each rule's `rule.ts` on every file it
applies to under the working directory, and prints one block of findings,
each with how sure the check is: 100% where code decided it, a decision
model's probability where the rule asked one. When the user names
directories or files, pass them, as in `bunx @webappwiz/cli scry
packages/api`. To check a change, add `--since <ref>`: `--since main` for
the branch's work, `--since HEAD` for what is not committed yet. When the user names
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

A rule asks a model through one of two tools in `Tools`. Both are a
`Decider`: `decide(question, span)` answers a yes-or-no question about a
span with the probability of yes.

- **`som`, a System One model (SOM)**, like Clef or Jev. It reads the file
  and answers at once, writing no text, so it is fast and cheap enough to
  ask about every candidate code finds. A rule asks it first.
- **`llm`, a large language model (LLM)**, like Claude. It reasons in text
  before it answers, so it is slower and dearer. A rule asks it only the
  questions `wiz scry eval` shows the som gets wrong.

Each question asks at the effort it names, `low`, `medium` or `high`, or
at the default. Unless a config names others, the som is `clef`, and
`clef-flash` at `low`; the llm is `claude-sonnet-5-5`, `claude-haiku-4-5` at
`low` and `claude-opus-5-5` at `high`. `clef` and `clef-flash`
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

The models are set in `.wiz/config.ts` (the project's) or
`~/.config/wiz/config.ts` (the user's own, over the project's), and
`WIZ_SCRY_JOBS` is over both. `scry.profiles` names other models to check
with, and `--profile <name>` picks one for one run, like checking again
with a `double-check` profile only the files a first check flagged. The two
runs report apart; comparing them is the caller's. `--cost` prints only an estimate
of the input tokens a check would spend, without asking a model; run it first
when the user asks what a check costs:

```ts
import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	scry: {
		// over the defaults, effort by effort: what it leaves out keeps the default
		models: {
			som: "jev-latest", // at every effort
			llm: { default: "claude-sonnet-5-5", high: "claude-fable-5-1" },
		},
		// laid over models by --profile double-check
		profiles: { "double-check": { som: "jev-preview" } },
		jobs: 8, // requests at once, to each model
		exclude: ["vendor/**"], // files no rule checks, from the project root
	},
});
```

Every answer is kept in `node_modules/.cache/webappwiz/scry`, so checking an
unchanged file again asks nothing, until a reply shows a model's name, like
`jev-latest`, stands for a new version: then what the old one answered is
asked again.

When it refuses a config holding `agents`, `batch`, `model` or `effort`,
`models` named by effort first like `{ high: { llm: ... } }`, or
`WIZ_SCRY_MODEL` or `WIZ_SCRY_EFFORT`, those are from before: show the user
the message, and with their yes, replace them with `models` by role, each
one model or one per effort, like `{ llm: { default: ..., high: ... } }`.
One naming `decider` in `models`, `profiles` or `budgets` is from before
it was called `som`: with the user's yes, rename it. A rule reading
`tools.decider` reads `tools.som` now. One holding
`budget` is from before `budgets`: ask the user what to declare instead.

## Budgets

`wiz scry` and `wiz scry eval` run only with `scry.budgets` declared: how
many input tokens each may spend on each model, the `som` and the
`llm`, over a window. What they spent is kept per user on the device, so
every worktree of a project draws on one budget.

When either says no budget is declared, declare `"nothing"` in the
project's `.wiz/config.ts`, which asks no model, so only code decides and
nothing is spent:

```ts
export default defineConfig({
	scry: { budgets: "nothing" },
});
```

Then tell the user you did, that every question a rule would ask a model
now goes unasked and is reported as not checked, and that they can allow
spending whenever they want. Raise a budget only when they ask, to what they
ask for:

```ts
scry: { budgets: "unlimited" }  // spend without a limit
scry: {
	budgets: [
		// every entry holds at once; a model no entry names spends nothing
		{ som: "unlimited", llm: 2_000_000, per: "month" },
		{ llm: 300_000, within: "7d" },
		{ llm: 100_000, per: "check" },
	],
}
```

- Each entry gives the `som`, the `llm` or both a number of input
  tokens, `"nothing"` or `"unlimited"`. A number needs a window: `per` a
  `"check"` (one run of `wiz scry` or `wiz scry eval`), or a calendar
  `"day"`, `"week"` (from Monday) or `"month"`, in local time; or `within`
  a rolling `"24h"`, `"7d"` or `"2w"`.
- Budgets are tokens, not money. When the user names an amount of money,
  say so, and help them pick tokens: `--cost` on a typical check says what
  it would spend, and the som is far cheaper per token than the llm.
- The last config to set `budgets` wins whole: `.wiz/config.ts` is the
  project's, shared by everyone who checks it out, and
  `~/.config/wiz/config.ts` is the user's own, over it. Ask which they mean
  when they have not said.

With a number to stay under, a run counts what it would ask first, and
refuses when that would go over any window. Show the user its message as
printed, and stop. **Never pass `--override-budget`, or raise a budget,
without the user's yes for that run;** a yes for one run is not one for the
next. Checking fewer files, by paths or `--since`, stays within what they
declared. `--cost` says what a check would use of each budget and what it
would leave; run it when the user asks whether a check fits.

## Exit codes

`wiz scry` exits:

- **0**: no error found, though warnings may be.
- **1**: a finding at `level: error`.
- **2**: a rule went unchecked on a file: it threw, a model's credentials
  were missing, or a budget left a question unasked, as `"nothing"` does.
  The report names each under "not checked".
- **3**: it did not run: no budget declared, or it would go over one.
- **130**: quit with a second ctrl-c; the first stops the check and
  reports what came back.

`wiz scry eval` exits 3 for the same reasons, and 0 when it ran.

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
