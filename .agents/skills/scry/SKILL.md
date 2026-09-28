---
name: scry
description: "Write, update, and remove the scry rules in this project's .wiz/scry, which `wiz scry` checks a change against like a linter. Use when the user explicitly asks for a rule, or asks for a style or convention change across the codebase that a rule could enforce from now on (\"stop using default exports\", \"comments should say why\"). Also use when asked to scry a change or run `wiz scry`."
version: 0.0.20
---

# Scry

`wiz scry` checks a change against the project's rules. A rule is a
directory under `.wiz/scry`, tracked with the code it governs:

```
.wiz/scry/<id>/
├── RULE.md        # required: what the rule wants, in prose an agent judges by
├── scripts/       # optional: programs that do the mechanical part
└── references/    # optional: anything longer the rule points to
```

`RULE.md` opens with frontmatter:

- `name`: its directory, in kebab case. Required.
- `description`: one line. Required.
- `files`: a glob of the files it applies to. Every file when absent.
- `level`: `error` or `warning`. `error` when absent.
- `effort`: how much judgment it takes, which picks the agent that checks
  it. `none` when its scripts decide it alone and no agent runs, `low` for a
  grep or a count, `medium` (the default) for most rules, `high` for design
  judgment across a whole file.

The body only has to say enough that an agent who reads nothing else knows
what counts and what does not. Good and bad examples do that best.

Code excuses itself from a rule with a comment holding
`scry-ignore <id>: <reason>`, which covers the statement under it, or
`scry-ignore-file <id>: <reason>`, which covers the whole file. Before scry
these were `rule-ignore` and `rule-ignore-file`; the old spelling still
counts, `wiz scry` names the files that use it, and renaming them is a plain
find and replace. When you touch one of those files, rename its comments.

Run the CLI with `bunx @webappwiz/cli scry`, which checks, or
`bunx @webappwiz/cli scry <command>`: `list`, `add <id>`, `add --recommended`,
`update`, `remove <id>`. `scry --help` says the rest. A project from before
scry, with rules in `.wiz/rules`, moves them with `bunx @webappwiz/cli update`.

## Checking a change

`wiz scry` is a linter: it finds the change with git, sends the changed
files to the agent their rules' effort names, and prints one block of
findings. When the user names directories or files, pass them, as in
`bunx @webappwiz/cli scry packages/api`, and it checks only the changed
files under them.
Show its report as it printed it, in one code block, and add nothing to it.
The progress lines it prints to stderr while the calls run are not part of
the report; leave them out.
Fixing what it found is a separate request; do not start unless asked.

When the prompts would cost more input tokens than the project's budget, it
asks `Proceed? [y/N]` on stdin. Run where nobody can answer, it prints the
question with `no answer on stdin` and exits 2. Then show the user that
question as printed, and ask exactly: "Proceed? yes or no". On a yes, rerun
with the answer piped in, `echo y | bunx @webappwiz/cli scry`, and on
anything else, stop. When they answer with paths instead, rerun with those
paths and without the piped answer: it asks again if that still costs too
much.

When it says there is no agent for effort `medium`, show the user the
message and ask which command should answer. Never pick a model or vendor
for them. Agents are shell commands that read a prompt on stdin and answer
on stdout. The prompt holds everything they need, so suggest turning their
tools off where the command allows it (`--tools ""` for `claude -p`): an
agent free to read the repository can spend minutes on it. For `claude -p`,
also suggest `--output-format stream-json --verbose
--include-partial-messages`: `wiz scry` recognizes that output and shows
what the model is doing and what the check really cost. They are set per
effort in `.wiz/config.ts` (the project's),
`~/.config/wiz/config.ts` (the user's own, over the project's), or
`WIZ_SCRY_AGENT_LOW`, `_MEDIUM`, `_HIGH` (over both):

```ts
import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	scry: {
		agents: {
			low: "<fast command>",
			medium: "<command>",
			high: "<strong command>",
		},
		budget: 100_000, // estimated input tokens a check spends without asking
		batch: 32_000, // estimated input tokens one agent call holds
		jobs: 4, // agent calls at once
	},
});
```

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
   of the rule, or as well: a linter checks every file for nothing, and a
   rule costs an agent call. When nothing the project runs fits, say so, and
   do not propose adopting a new tool unless asked.
3. When a shipped rule covers it, `wiz scry add <id>` copies it in, and it can
   be edited from there. Otherwise write `.wiz/scry/<id>/RULE.md`, with an
   id that says what the rule wants.
4. Pick the lowest effort that can judge it. When part of it is mechanical,
   offer a script (see Scripts); when a script can decide all of it, the
   rule takes `effort: none` and costs nothing to check.
5. Run `wiz scry list`, which validates every rule's frontmatter and names the
   line that is wrong.

## Updating a rule

Edit it, and check the project's tooling again when what it asks changes.
Keep its examples in step with its prose. A rule copied from the catalog
takes local edits, but `wiz scry update` overwrites them; say so before editing
one that carries a `version`, and offer to drop that line so the copy
becomes the project's own.

## Removing a rule

Confirm with the user, then run `wiz scry remove <id>`, which deletes its
directory, scripts and all.

## Scripts

A script does the part of a rule a program can settle. `wiz scry` runs
every file in the rule's `scripts/`, so each one follows this contract:

- It opens with a `#!` line naming what runs it, such as `#!/bin/sh` or
  `#!/usr/bin/env bun`. That line is how it runs; it needs no executable bit.
- It takes the files to check as arguments, from the project root.
- It prints one candidate a line, `file:line: message`, and exits 0 whether
  it found anything or not. A nonzero exit reports the rule as not checked.
- It reads and never writes.

With `effort: none`, every line it prints is a finding. With any other
effort, its lines are candidates the agent judges, so a script that only
narrows the search is still worth having. Write it in whatever the project
already runs, so it needs nothing new installed.

**Every new or changed script needs the user's approval before it is
saved.** Show the whole script, or the whole diff, and say plainly that it
runs on every future `wiz scry`, on whatever machine runs one, so it
deserves the same line-by-line reading as any code about to execute.
Strongly encourage them to read it, then wait for a yes. The same goes for
scripts that arrive from elsewhere: when `wiz scry add` or `wiz scry update`
reports a script, pass its warning on and ask the user to read it before the
next check.
