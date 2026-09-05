---
name: arbor
description: Use the @webappwiz/arbor CLI to land your work on trunk, or a base branch given as an argument, from an isolated git worktree without pull requests. Read this before making any code change in an arbor repository, since it decides where the work happens, and whenever you need to add, claim, merge, remove, list, show, locate, or escalate a task.
version: 0.0.14
---

# Using arbor

`arbor` runs many agents on one repo, each in its own git worktree, landing on
trunk without pull requests. Run it with `bunx @webappwiz/arbor <command>` (or
`arbor` if on PATH). `arbor --help` explains the commands; this file covers
only what the CLI cannot tell you.

**Rule:** never use raw git for state transitions arbor covers. Every landing
goes through `arbor merge`. The only exception is finishing an in-progress
rebase (`git add`, `git rebase --continue`), then merging again.

A failed command prints `{reason}` JSON on stdout and instructions on stderr:
do what stderr says. The one case to memorize is exit 4 `lease_lost`: stop,
do not retry, another agent owns the tree.

## Before you start

Other agents may already be working. Before creating anything, list the files
you expect to touch, then `arbor list`, and for each task in flight compare with
its changed files:
`git -C "$(arbor path <task>)" diff --name-only main...task/<task>`
(`arbor show <task>` for its plan; neither takes its lease).

If nothing overlaps, carry on. If something does, `arbor add` your task if you
have not already and record the overlap in `ARBOR.md` (which task, which
files). Some overlap is normal: work alongside and accept the rebase. Only
when the overlap is significant and you expect merge conflicts that would be
hard to resolve, `arbor wait <task>` on the task you overlap with instead:
let it land first and your rebase is onto its work rather than against it.

Waiting is caution, reserved for overlap that warrants it. Escalate
instead only when the other task is doing something majorly different from
yours, or contrary to it: rewriting what you are extending, or asked for the
opposite of what you were. Then `arbor escalate` and ask the user whether to
wait for it, work alongside it and accept the rebase, or drop yours.

Act on how the wait ends:

- `removed`: it landed or was dropped. Redo the overlap check (trunk moved)
  and carry on.
- `escalated`: your work is blocked on a person too. Tell the human what it
  is blocked on and wait.
- `orphaned`, `stray`, `unrecorded` or `unknown`: that tree is broken. A tree
  mid-merge can read as `orphaned` for a moment, so `wait` once more before
  believing it, then say so and ask.
- exit 14 `timeout`, still `working` or `merging`: `wait` again (with
  `--timeout-secs` if the task looks close), or offer the choice of
  working alongside it or picking up something else, saying what you have not
  started.

A `stale` lease on a `working` task is normal (arbor only heartbeats while a
command runs): watch a task's status, never its lease.

## Workflow

1. `arbor add <task>`, or `arbor claim <task>` to resume one. When this skill
   is invoked with a branch argument (`/arbor feature/auth`), or the user
   names the branch the work should land on, pass it as `--base` to every
   task you create for that request. Otherwise omit `--base`; never guess a
   base from the currently checked-out branch, unless you are handing out part
   of your own task (below).
2. Fill in the `ARBOR.md` stub `add` wrote at the worktree root (see below)
   before touching code.
3. Do the work, updating `ARBOR.md` as you go; commit with git (arbor never
   commits for you).
4. `arbor merge`. On failure, do what stderr says and merge again.

A successful merge deletes the worktree, and your working directory with it:
`cd` to the main tree (merge prints its path) before running anything else.

## Handing out part of your task

arbor runs from inside a worktree as well as from the main tree, so you can
hand part of your own task to other agents from within yours. Each part gets
its own task based on yours: `arbor add <part> --base task/<your task>`, then
`arbor merge` as usual. It lands on your branch rather than trunk, and you
land the lot with your own merge.

A part lands by fast-forwarding your branch where it is checked out, which is
the tree you are standing in, so:

- Keep your tree committed while parts are out. Git refuses a merge that would
  overwrite uncommitted changes, and that failure lands on the other agent
  rather than on you.
- Expect files to appear and change under you. After a part lands, re-read
  what you are about to edit instead of writing it from memory.

Split only along lines that make separate tasks: a part is worth handing out
when saying what it needs is shorter than doing it.

## Escalation

Merge only work you verified yourself. Escalate instead when verification
needs a person: external services, destructive migrations, anything tests
cannot confirm. And if the user asked to see the work before it lands,
escalate regardless.

1. `arbor escalate <reason>`.
2. Under `## Blocked` in `ARBOR.md`, state what needs verifying, ending in a
   question a yes/no or a sentence can answer.
3. Leave something the human can look at and print its **absolute path**
   (start from `arbor path <task>`). For anything visual or UX, that means a
   screenshot; if producing one is expensive or has side effects, ask before
   starting and say what it will cost.

If you claim a tree whose `## Blocked` question is unanswered, do not resume
or merge: ask the user and wait for the answer.

## Reporting

However a task ends, say so in one block; only a merge names a base:

```markdown
### ✅ Merged `<task>` onto `<base>`

One sentence blending what the task set out to do with where it ended up.
```

```markdown
### ⚠️ Escalated `<task>`

One sentence blending what the task set out to do with what it now waits on.
```

```markdown
### 🛑 Removed `<task>`

One sentence blending what the task set out to do with why you `arbor rm`ed
it instead.
```

Anything else worth saying goes after this block, not instead of it.

## ARBOR.md

Your session can die at any moment; `ARBOR.md` is what lets a stranger
`arbor claim` the task and continue. Fill in the stub `add` wrote to this
shape:

````markdown
# <task>

## Goal

One or two lines on what done means.

## Files

- every/path/you/plan/to/touch.ts

## Done

- [x] finished steps move here: these checkboxes are the only progress the
      task reports

## Next

- [ ] every step you can foresee, roughly one commit each

## Notes

Decisions, dead ends, and how to verify.
````

Keep the whole file current throughout implementation, not at the end: after
each step lands, check it off and move it to `## Done`, and when the set of
files you are touching changes, change `## Files` to match. A stale plan is
worse than none, and a session that dies mid-task reports nothing.

`arbor show <task>` prints the file and every way it departs from the
expected shape; run it on your own task after writing the file. `add` excludes
`ARBOR.md` from git for you: never commit it, and never mention it in a commit
message.

## Committing

Plain, human-style commit messages with **no attribution**: no
`Co-authored-by:` trailers, no "Generated with", no agent or model names, no
`--author` overrides. Commit as often as it helps you; a task usually takes
fewer than 5 commits, and wanting many more means the task wants splitting,
not squashing.
