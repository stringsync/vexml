---
name: scry
description: "Write, update, and remove the scry rules in this project's .wiz/scry, which `wiz scry` checks code against like a linter. Use when the user explicitly asks for a rule, or asks for a style or convention change across the codebase that a rule could enforce from now on (\"stop using default exports\", \"comments should say why\"). Also use when asked to scry a change or run `wiz scry`."
version: 0.0.52
---

# Scry

`wiz scry` checks code against the project's rules, like a linter. A rule is
a directory under `.wiz/scry`, tracked with the code it governs:

```
.wiz/scry/<id>/
├── rule.ts        # the check and its settings, asking a model only what code cannot
├── RULE.md        # what the rule wants, and why, in prose
├── rule.test.ts   # its tests, on its labeled cases
└── evals/         # labeled cases: files that follow the rule, and files that break it
```

Code excuses itself from a rule with a comment holding
`scry-ignore <id>: <reason>`, which covers the statement under it, or
`scry-ignore-file <id>: <reason>`, which covers the whole file.

Run the CLI with `bunx @webappwiz/cli scry`, which checks, or
`bunx @webappwiz/cli scry <command>`: `list`, `add <id>`, `add --recommended`,
`update`, `remove <id>`, `test [ids]`, `eval [ids]`, `why <path:line>`.
`scry --help` says the rest.

Read further only for the work in front of you:

- **Adding or updating a rule**: [references/authoring.md](references/authoring.md)
  first, every time.
- **Changing the models, profiles, budgets or rule options a config sets**:
  [references/config.md](references/config.md).

## Checking a change

`wiz scry` runs each rule's `rule.ts` on every file it applies to under the
working directory, and prints one block of findings, each with how sure the
check is: 100% where code decided it, a model's probability where the rule
asked one. When the user names directories or files, pass them, as in
`bunx @webappwiz/cli scry packages/api`. To check a change, add
`--since <ref>`: `--since main` for the branch's work, `--since HEAD` for what
is not committed yet; with `--changed-lines` too, it reports only what is on
the lines the change added or changed. When the user names rules, pass `--rule <id>,<id>`,
and when they want one of a rule's options set otherwise for one run,
`--option <rule>.<option>=<value>`. Show its report as it printed it, in one code block, and add nothing to it.
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

## Credentials

A rule asks a model through `som`, a System One model like Clef or Jev, fast
and cheap, or `llm`, a large language model like Claude, which reasons first.
Each needs its provider's credentials, from the environment, else the
project's store, else the device's. When `wiz scry` says one is missing, ask
the user to run `bunx @webappwiz/cli creds add <NAME> --device` themselves,
which asks for the value at a hidden prompt. Never ask for a value, set one,
or look one up; `bunx @webappwiz/cli creds list` shows what is there without
showing any.

## Budgets

`wiz scry` and `wiz scry eval` run only with `scry.budgets` declared: how
many input tokens each may spend on the `som` and the `llm`; only a check
with both models turned off needs none (see Turning a model off). When either
says no budget is declared, declare `"nothing"` in the project's
`scry.config.ts`, which asks no model, so only code decides:

```ts
import type { ScryConfig } from "@webappwiz/scry/config";

export default { budgets: "nothing" } satisfies ScryConfig;
```

Then tell the user you did, that every question a rule would ask a model
now goes unasked and is reported as not checked, and that they can allow
spending whenever they want. For one free run without touching the config,
turn both models off instead (see Turning a model off). Raise a budget only
when they ask, to what they ask for (see [references/config.md](references/config.md)).

When a run would go over a budget, it refuses. Show the user its message as
printed, and stop. **Never pass `--override-budget`, or raise a budget
(`wiz scry budgets raise` included), without the user's yes for that run;** a yes for one run is not one for the
next. Checking fewer files, by paths or `--since`, stays within what they
declared. `--cost` says what a check would spend of each budget, without
asking a model; run it when the user asks what a check costs or whether it
fits.

## Turning a model off

`--disable som` or `--disable llm` turns that model off for one run; give
it twice to turn both off. Add `=<reason>` to say why, as in
`--disable "llm=saving tokens"`; without one the reason is
`<model> disabled with --disable`. Any other value is refused.

- **Both off** checks only what code decides, for free: it needs no
  `scry.budgets` declared and no credentials, and spends nothing. Run it
  for a free pass, such as when a run would go over a budget or no budget
  is declared, and the user has not said yes to spending. It is not a way
  round a budget: say what it left unchecked.
- **Over budget.** `--disable-over-budget` turns off each model the
  budgets no longer cover (none declared, budgeted `"nothing"`, or too
  little left for the run) instead of refusing, so the run fits what the
  user declared. A project's fix command may pass it; say what it left
  unchecked as for any model that is off.
- **One off** still asks the other, so a budget must be declared, and the
  run is held to it as ever, counting first and refusing past it. Credentials
  are needed only for the model left on.
- **What is unchecked.** A rule that asks a model that is off goes
  unchecked on that file; whatever code decides in it on files where it
  asks nothing still reports. The report lists each such rule under
  "needs a model that is off", with how many files and the reason, and
  the tally ends with `without the llm`, `without the som`, or
  `by code alone`. Pass that section on with the report: those rules were
  not checked, so never call the change clean of them.
- **`--cost`** with one off counts only what the other would ask, and
  lists the same section above the estimate.
- **`--format json`** keeps each in `unchecked`, with `rule`, `reason`,
  and `unasked: "disabled"`. A question a budget left unasked has
  `unasked: "budget"`; anything else in `unchecked` is a rule that broke.
- **`wiz scry eval`** does not take it: it scores rules against their
  cases, and a rule whose model is off would score nothing.

Under the hood each model that is off is a `DisabledDecider(reason)`, which
throws `Unasked` with that reason and a `kind` of `disabled`; a budget that
runs out throws `Unasked` with a `kind` of `budget`. Both reach the report
only when a rule lets them through (see
[references/authoring.md](references/authoring.md)).

## Exit codes

`wiz scry` exits:

- **0**: no error found, though warnings may be.
- **1**: a finding at `level: error`.
- **2**: a rule went unchecked on a file: it threw, a model's credentials
  were missing, or a budget left a question unasked, as `"nothing"` does.
  The report names each under "not checked". Never for a rule
  that asked a model `--disable` turned off, which is listed under
  "needs a model that is off" instead.
- **3**: it did not run: no budget declared, or it would go over one.
- **130**: quit with a second ctrl-c; the first stops the check and
  reports what came back.

`wiz scry eval` exits 3 for the same reasons, and 0 when it ran.

## When a style change could be a rule

When the user asks for a change across the codebase that should hold from
now on, not just once, offer a rule for it before or alongside making the
change: a rule keeps the next change from undoing it. Making the change now
and adding the rule are two pieces of work; say which you are doing.

## Rules from elsewhere

**Every new or changed `rule.ts` needs the user's approval before it is
saved**, since it runs on every future `wiz scry`, on whatever machine runs
one. That holds for code that arrives from elsewhere too: when `wiz scry add`
or `wiz scry update` reports a file, pass its warning on and ask the user to
read it before the next check.

To remove a rule, confirm with the user, then run `wiz scry remove <id>`,
which deletes its directory, check and all.

## From older versions

When `wiz scry` refuses a config key it no longer takes, or names files still
using `rule-ignore`, show the user its message, and with their yes do what it
says. When it does not say what to use instead, ask. When you touch a file
that uses `rule-ignore`, rename its comments to `scry-ignore`. When it says scry's
settings have moved, `wiz scry update` moves them from `.wiz/config.ts` to
`scry.config.ts`. Rules still in `.wiz/rules` move with `wiz scry update`
too, and a rule reading
`tools.decider` reads `tools.som` now.
