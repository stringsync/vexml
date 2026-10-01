---
name: arbor
description: Use the @webappwiz/arbor CLI to land your work on trunk, or a base branch given as an argument, from an isolated git worktree without pull requests. Read this before making any code change in an arbor repository, since it decides where the work happens, and whenever you need to add, claim, merge, remove, list, show, locate, escalate, or defer a task.
version: 0.0.23
---

# Using arbor

`arbor` runs many agents on one repo, each in its own git worktree, landing on
trunk without pull requests. Run it with `bunx @webappwiz/arbor <command>` (or
`arbor` if on PATH). `arbor --help` explains the commands; this file covers
only what the CLI cannot tell you.

**Rule:** never use raw git for state transitions arbor covers. Every landing
goes through `arbor merge`. The exception is finishing an in-progress rebase
(`git add`, `git rebase --continue`), then merging again.

A failed command prints `{reason}` JSON on stdout and instructions on stderr:
do what stderr says. Memorize one: exit 4 `lease_lost` means stop, do not
retry, another agent owns the tree.

## Workflow

1. **Check for overlap.** List the files you expect to touch and compare with
   `arbor list --files`. Some overlap is normal: work alongside and accept the
   rebase, noting it in `ARBOR.md`. Only when conflicts would be hard to
   resolve, `arbor wait <task>` for the other task to land first. If it is
   doing the opposite of what you were asked, escalate instead.
2. **Start.** `arbor add <task>`, `arbor add <task> --todo <id>` to take up a
   todo, or `arbor claim <task>` to resume one. Pass `--base <branch>` only
   when invoked with a branch (`/arbor feature/auth`) or the user names one;
   never guess a base from the checked-out branch.
3. **Plan.** Fill in the `ARBOR.md` stub before touching code (see below).
4. **Work.** Commit with git as you go; arbor never commits for you. Defer
   anything outside your Goal with `arbor todo add "<text>"` and move on.
   Between steps, run `arbor replies`: your human may have followed up an
   answer (see Follow-ups).
5. **Squash** to one commit (see Committing), then **`arbor merge`**. On
   failure, do what stderr says and merge again.

A successful merge deletes the worktree and your working directory with it:
`cd` to the main tree it prints before running anything else.

`wait` ends on `removed` (landed or dropped: redo the overlap check),
`escalated` (the other task needs a person: tell the user you are blocked on
it), a broken status (`wait` once more, then ask), or exit 14 `timeout` (wait
again or work alongside). A `stale` lease on a `working` task is normal: watch
status, never the lease.

## Deferring work

When something comes up that is not your Goal (a bug next door, a follow-up,
a reply that widens the task), `arbor todo add "<one line>"` from your
worktree and keep going. Do not grow the task. `merge` recommends the next
todo when you land; mention it in your report (see Reporting).

## Handing out part of your task

`arbor add <part> --base task/<your task>` from inside your tree makes a task
that lands on your branch instead of trunk. While parts are out, keep your
tree committed (a part lands by fast-forwarding your checkout), re-read files
before editing them, and squash only after every part has landed. Hand a
part out only when describing it is shorter than doing it.

## Escalation

Merge only work you verified yourself. Escalate when verification needs a
person (external services, destructive migrations, visual changes), when the
user asked to see the work first, or, absent instructions, when the change is
complex enough that correctness needs a reader rather than a test.

1. `arbor escalate <reason>`. When the only thing left is the user's
   approval, `arbor escalate --review "<what to look at>"` instead: it asks
   `✅ Ready to merge?` for you, and the page shows Approve and Request
   changes. Settle every other question first; it refuses while one is
   unchecked.
2. Leave something to look at, by **absolute path** (start from
   `arbor path <task>`): a screenshot for anything visual. Ask first if
   producing it is expensive.
3. Write each question under `## Blocked` in `ARBOR.md`, then report.
4. Wait for answers. If your harness can run a command in the background and
   wake you when it exits (Claude Code's `run_in_background` can), start
   `arbor wait <task> --answered` that way; the user may answer from the inbox
   or in chat, whichever comes first. If it cannot, do not run it: end your
   turn, and run `arbor replies <task>` when you are back.

Number what you did D1, D2, … and what you need Q1, Q2, …. A Q's line is its
subject: short enough to scan in an inbox, led by one emoji for what it is
about (🎨 ui, 🗄️ db, 🔐 auth, 🧪 tests), or ❓ when none fits (repeats are
fine), and ending in the question.
Everything else goes in lines indented under it, which render as markdown:
detail, code blocks, and screenshots as `![what](/abs/path.png)`, which the
inbox shows inline. Ask for what is wrong rather than a bare yes or no. When
the answer is one of a few, list `- (a) ...` lines last (pick one, or none);
for "all that apply", `- [a] ...` lines. A reply names its picks spelled out
(`a (Email), c (Push)`), may add words after a colon, or may answer in words
alone. Numbers never change; new ones continue from the highest.

````markdown
## Blocked

- [x] Q1. 🧪 Do the live tests pass against staging? → yes
- [ ] Q2. 🎨 Does the header wrap to two lines?
  ![header at 390px](/abs/path/shot.png)
- [ ] Q3. 🔐 How should existing sessions move to the new tokens?
  Sessions are keyed by the old cookie:

  ```ts
  const session = await sessions.find(cookie);
  ```

  - (a) Sign everyone out once
  - (b) Migrate each session on its next request
````

Replies arrive in chat or in the inbox. Read inbox replies only through
`arbor wait <task> --answered` or `arbor replies <task>`: either claims them,
writing each after `→` on its question's line, and a claimed reply can no
longer change under you. Never read them any other way. Write a chat reply
after `→` yourself, matching it by number (`q1`, `Q1:` and `1.` all mean Q1). Check an item off only when the answer is one you can act on, and
write it after `→`; anything else stays open and leads your next report. A
reply to a D item is an instruction. "Deferred to todo 7" and "Skip this"
mean leave it out and carry on: check the item off. "Approved: merge it."
answers a review: check it off and merge. `arbor merge` refuses with exit 16
`blocked` while `## Blocked` has an unchecked item, and exit 15 `unread`
while a reply waits unclaimed. `arbor claim` resumes an escalated task. `arbor retry` is only
for `budget_exhausted`, and is the human's to run, before you claim.

## Follow-ups

Your human can follow up any answer you already read, even one you checked
off. `arbor replies` (and `arbor wait --answered`) writes a follow-up on a
`→ ` line of its own under its question and unchecks the question. Treat it
as an instruction from the user: act on it, then check the question off
again. You never answer questions, yours or another agent's: say what you
need in your report or under `## Blocked`.

## Reporting

However a task ends, say so in one block; only a merge names a base:

```markdown
### ✅ Merged `<task>` onto `<base>`

One sentence blending what the task set out to do with where it ended up.

Next: todo <id>, <its text>. Stale: todo <id> (remove?).
```

Leave out the `Next` line when merge recommended nothing.

```markdown
### ⚠️ Escalated `<task>`: <what it waits on, in a few words>

Done:
- D1. One line per change.

Needs you:
- Q1. One subject line per item.
```

```markdown
### 🛑 Removed `<task>`

One sentence on what the task set out to do and why you removed it.
```

Anything else worth saying goes after the block, not instead of it.

## ARBOR.md

Your session can die at any moment; `ARBOR.md` is what lets a stranger
`arbor claim` the task and continue. Size it to the task: a few lines for a
small change, a full record for a long one.

````markdown
# <task>

## Goal

One or two lines on what done means.

## Files

- every/path/you/plan/to/touch.ts

## Done

- [x] finished steps: the only progress the task reports

## Next

- [ ] every step you can foresee, roughly one commit each

## Notes

Decisions, dead ends, and how to verify.
````

Keep it current as you go, not at the end: move steps to `## Done` as they
land and keep `## Files` matching what you touch, since `arbor list --files`
shows it to other agents. Run `arbor show <task>` after writing it to check
the shape. It is excluded from git: never commit it or mention it in a commit
message.

## Committing

Plain, human-style messages with **no attribution**: no `Co-authored-by:`,
no "Generated with", no agent or model names, no `--author`. Commit as often
as helps; wanting many more than 5 commits means the task wants splitting.

Before `arbor merge`, squash to one commit describing the net change, what
the base gains, not the path you took:

```sh
git reset --soft "$(git merge-base <base> HEAD)" && git commit -m "<message>"
```

`<base>` is what `arbor show <task>` prints: trunk unless the task was created
with `--base`.
