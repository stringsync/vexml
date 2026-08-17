---
name: arbor
description: Use the @webappwiz/arbor CLI to land your work on trunk, or a base branch given as an argument, from an isolated git worktree without pull requests. Read this before making any code change in an arbor repository, since it decides where the work happens, and whenever you need to add, claim, merge, remove, list, show, locate, or escalate a task.
argument-hint: "[base-branch]"
version: 0.0.0
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
you expect to touch, then `arbor ls`, and for each task in flight compare with
its changed files:
`git -C "$(arbor path <task>)" diff --name-only main...task/<task>`
(`arbor show <task>` for its plan; neither takes its lease).

If nothing overlaps, carry on. If something does, wait for it to land rather
than buying a rebase conflict: say one line about what you are waiting on,
then re-check periodically. A status is only true for the moment you read it,
so re-run `arbor ls` every time you are about to repeat one. Act on what it
becomes:

- gone from `arbor ls`: it landed. Redo the overlap check (trunk moved) and
  carry on.
- `escalated`: your work is blocked on a person too. Tell the human what it
  is blocked on and wait.
- `orphaned`, `stray`, `unrecorded` or `unknown` with nobody driving it: that
  tree is broken. Say so and ask. (A tree mid-merge can read as `orphaned`
  for a moment, so trust a broken status only if it survives a second look.)
- still `working` or `merging` after however long the human would tolerate
  hearing nothing: offer the choice of waiting longer, working alongside, or
  picking up something else, and say what you have not started.

A `stale` lease on a `working` task is normal (arbor only heartbeats while a
command runs): when waiting, watch a task's status, never its lease.

## Workflow

1. `arbor add <task>`, or `arbor claim <task>` to resume one. When this skill
   is invoked with a branch argument (`/arbor feature/auth`), or the user
   names the branch the work should land on, pass it as `--base` to every
   task you create for that request. Otherwise omit `--base`; never guess a
   base from the currently checked-out branch.
2. Fill in the `ARBOR.md` stub `add` wrote at the worktree root (see below).
3. Do the work; commit with git (arbor never commits for you).
4. `arbor merge`. On failure, do what stderr says and merge again.

A successful merge deletes the worktree, and your working directory with it:
`cd` to the main tree (merge prints its path) before running anything else.
Then report it:

````markdown
### ✅ Merged `<task>` onto `<base>`

One sentence blending what the task set out to do with what actually changed.
````

✅ for a merge, ❌ for a task you `arbor rm`ed instead. Anything else worth
saying goes after this block, not instead of it.

## ARBOR.md

Your session can die at any moment; `ARBOR.md` is what lets a stranger
`arbor claim` the task and continue. Fill in `## Goal` (one or two lines on
what done means) and list every step you can foresee under `## Next` as
`- [ ]` items, roughly one commit each. Move items to `## Done` as you finish
them: those checkboxes are the only progress the task reports. Decisions,
dead ends and how to verify go under `## Notes`. Update it as you go; a stale
plan is worse than none.

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
