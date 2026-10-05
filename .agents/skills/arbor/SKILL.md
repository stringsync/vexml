---
name: arbor
description: Use the @webappwiz/arbor CLI to land your work on trunk, or a base branch given as an argument, from an isolated git worktree without pull requests. Read this before investigating anything that may lead to a code change in an arbor repository, since it decides where the work happens, and whenever you need to add, claim, merge, remove, list, show, locate, escalate, or defer a task, or add, pick up, or reorder a todo.
version: 0.0.36
---

# Using arbor

`arbor` runs many agents on one repo, each in its own git worktree, landing on
trunk without pull requests. Run it with `bunx @webappwiz/arbor <command>` (or
`arbor` if on PATH). `arbor --help` explains the commands; this file covers
only what the CLI cannot tell you.

**Rule:** never use raw git for state transitions arbor covers: every landing
goes through `arbor merge`. The exception is finishing a rebase left in
progress (`git add`, `git rebase --continue`), then merging again. A failed
command prints `{reason}` JSON on stdout and instructions on stderr: do what
stderr says.

## Workflow

1. **Start before you look.** When a request may end in a code change,
   `arbor add <task>` before reading any code, and investigate in its
   worktree: the main tree changes under you as other tasks land, a worktree
   does not. A question that only needs an answer stays in the main tree.
   `arbor claim <task>` resumes a task instead. When the request is a todo,
   such as `[ARBOR TODO #N]` copied from the `arbor dev` page, `arbor todo
   show N` prints what is asked; if it names another task that took it, tell
   the user rather than start on it. Otherwise take it now, so no other agent
   starts on it: `arbor add <task> --todo N`, or `arbor todo take N` from a
   task under way. Pass `--base <branch>` only when invoked with a branch
   (`/arbor feature/auth`) or the user names one; never guess a base from the
   checked-out branch.
2. **Plan.** Once you know what done means, fill in `ARBOR.md` before
   touching code (see ARBOR.md below), then groom the todos your work touches
   (see Grooming related todos).
3. **Check for overlap.** Compare your `## Files` with `arbor list --files`.
   Some overlap is normal: work alongside, accept the rebase, and note it in
   `ARBOR.md`. Only when conflicts would be hard to resolve, `arbor wait
   <task>` for the other task to land first. If it is doing the opposite of
   what you were asked, escalate instead.
4. **Work.** Commit each step with git as you go, and move it to `## Done`
   as you commit it; arbor never commits for you. When something outside
   your Goal comes up (a bug next door, a follow-up, a reply that widens the
   task), `arbor todo add` it from your worktree and move on,
   so the task stays one coherent change. Ask about each call the request
   does not settle as you make it, and keep going (see Asking as you go),
   bringing `## Blocked` up to date before each step.
5. **Land.** Groom again, release each todo you only partly did (see Todos),
   squash to one commit (see Committing), and `arbor merge`. On failure, do
   what stderr says and merge again. A successful merge deletes your
   worktree: `cd` to the main tree it prints before running anything else.

**Clean up every task you start.** A task ends in a merge or a remove, never
left behind; one escalated and waiting on the user is not done, so leave it
for `arbor claim`. When investigating shows there is nothing to change, the
work is moot, or it is better redone against current trunk, `arbor todo
remove` each todo it holds that is done or moot, `arbor todo update` the rest
with what you learned, then `cd "$(arbor path)"` and `arbor remove <task>`,
which puts them back on the list.

`wait` ends on `removed` (landed or dropped: check for overlap again),
`escalated` (the other task needs the user: tell them you are blocked on it),
or a broken status (`wait` once more, then ask). Judge a task by its status,
never its lease: `stale` is normal for one mid-edit.

## Todos

Write a todo's subject the way you write a question's, short enough to scan.
Put the why, the where, and anything else in its detail, as markdown the
`arbor dev` page renders: paragraphs, lists, `- [ ]` steps, inline code for
paths and commands, and fenced blocks for snippets. Single quotes keep the
shell off the backticks:

```sh
arbor todo add "Upload retries forever on a 413" 'The client retries on any 4xx in `src/upload.ts`.

- [ ] stop retrying on 413
- [ ] tell the user the file is too big'
```

Tag a todo with the part of the product or the goal it belongs to, like
`uploads` or `dark-mode`, so related todos group together:

- Reuse a tag from `arbor todo tags` whenever one fits.
- Never name the kind of work (`bug`, `refactor`), a task, a person, a
  priority, or a status: the subject, position, and taken-by already say
  those.
- One or two tags a todo, or none when nothing groups it.
- A todo that comes up in your task gets the tags of the todos your task
  holds when it belongs with them, so the next grooming finds it.

`arbor todo update <id> '<detail>'` replaces the whole detail, so pass all of
it: what still holds and what you learned. Merging removes every todo the task
holds: update one you only partly did with what is left, then
`arbor todo release` it, so it stays on the list.

### Positions

Only the user's priorities decide a position, so a new todo goes to the
bottom unless they say otherwise:

- "urgent", "next", "before anything else": `--position 1`.
- "fast follow", "right after this", "soon": just below the urgent todos at
  the top. Read `arbor todo list` to find the spot.
- "deferred", "someday", "later", "nice to have", or nothing at all: the
  bottom, the default.

To move one that exists ("bump 12", "push the upload one down", "do 7 before
4"), read `arbor todo list` to turn the ask into a number, `arbor todo update
<id> --position <n>`, then read the list again to check the order is the one
asked for.

### Grooming related todos

Todos sharing tags with yours are about the same area: your change can settle
them, shrink them, move what they point at, or make them wrong, and you hold
the context that makes each one cheap right now. Groom them once you have
planned, and again just before merging:

1. **Gather the tags** of every todo your task holds, or, when it holds none,
   the ones from `arbor todo tags` that name the area of your Goal.
2. **List the related todos**: `arbor todo list --tag <tag>,<tag>` with all of
   them, leaving off `--open`, since a todo another task has taken can still
   be affected by yours. `arbor todo show` each one your work might touch.
3. **Act on each one**, in this order of preference:
   - **Claim it** when it is open and your change settles it, makes it moot,
     or would with a little more work in the same files: `arbor todo take
     <id>` and add it to your Goal. Claim every one you can, since the next
     agent would have to rebuild the context you have now, as long as the
     task stays one coherent change: that is grooming, not growth.
   - **Update it** when your change alters it without settling it (a path
     moved, a step is done, the approach no longer fits), ticking off the
     `- [ ]` steps you did.
   - **Retag it** when it belongs to another area.
   - **Coordinate** when another task has taken it and your change affects
     it: never take it, compare files with `arbor list --files`, and note it
     in `ARBOR.md`.

### The next todo

Whenever a task ends, merged or removed, propose the next todo, so the
context this conversation built up gets used before it is gone: from
`arbor todo list --open`, the one most related to the work just done (the
same files, feature, or problem; `arbor todo show` one to be sure), preferring
one that came up in the task, then one sharing a tag with the todos it held;
among equally related ones, or when none is related, the top of the list.
`merge` prints its pick by that order; `remove` prints none. After a merge,
also propose the next one or two when they are as related, so the user can
choose.

### Proposing a todo

Whenever you put a todo in front of the user, one you propose or one you just
added, head it one level below the report's title with 📝, its subject
exactly as `arbor todo show` prints it, and its id, then write two sentences:
what the todo is, and why it matters now, such as what it shares with the
work just done.

```markdown
### 📝 Upload retries forever on a 413 [#12]

The client retries every 4xx in `src/upload.ts`, so an oversized file never
fails. It touches the retry loop this task just rewrote.
```

The 📝 belongs to the heading: leave it out of `arbor todo add` and
`--subject`.

## Handing out part of your task

`arbor add <part> --base task/<your task>` from inside your tree makes a task
that lands on your branch instead of trunk. While parts are out, keep your
tree committed (a part lands by fast-forwarding your checkout), re-read files
before editing them, and squash only after every part has landed. Hand a
part out only when describing it is shorter than doing it.

A subagent that may change code works in a part, never its own task on
trunk, so the user reviews one body of work rather than many small ones.
Add the part yourself, then tell the subagent:

- to `arbor claim <part>` and work only in the worktree it prints;
- not to escalate, report to the user, or take todos: it is your part, and
  you are the one the user hears from;
- to make each call the request does not settle as it sees fit, listing in
  its reply what it chose and what else it could have done, never under
  `## Blocked`, which would stop `arbor merge`;
- to squash and `arbor merge` the part when done, landing it on your branch.

Write each call it lists under your own `## Blocked`, and redo the part when
an answer overturns one. A subagent that only reads needs no part. When the
user asks for the subagents' work to land on its own, give each one a task of
its own on trunk instead, and let it follow this skill as written.

## Asking as you go

Do not save questions for escalation. Whenever you make a decision that does
not clearly follow from what the user asked (a name, a default, behavior they
never mentioned, one reading of an ambiguous ask), write a question under
`## Blocked` in `ARBOR.md` right away, saying what you chose and what else you
could have done, and carry on: the user can answer in chat while you work.
When an answer overturns a choice, redo that part.

Number questions 1, 2, … in the order you ask them; numbers never change, and
new ones continue from the highest. A question's line is its subject, short
enough to scan and ending in the question; everything else goes in markdown
lines indented under it, code blocks included. Ask for what is wrong rather
than a bare yes or no. When the answer is one of a few, end with `- (a) ...`
lines (pick one, or none), or `- [a] ...` lines for all that apply.

```markdown
## Blocked

- [x] 1. Do the live tests pass against staging? → yes
- [ ] 2. Does the header wrap to two lines?
  ![header at 390px](/abs/path/shot.png)
- [ ] 3. How should existing sessions move to the new tokens?
  Sessions are keyed by the old cookie.
  - (a) Sign everyone out once
  - (b) Migrate each session on its next request
```

## Keeping Blocked current

`## Blocked` is where every question the user sees comes from, so it must say
what you need right now. Before you continue with any work (after the user
replies, after `arbor claim` returns, and between steps), bring it up to date:

- write every answer the user gave after `→` on its question's line, and
  check off each question you have acted on;
- write a follow-up to an answer, even a checked one, on a `→ ` line of its
  own under the question, and uncheck the question until you have acted on
  the follow-up;
- check off any question that no longer applies, with why after `→`
  (`→ moot: the header was removed`), rather than deleting it;
- retake each screenshot an open question shows once your work has changed
  what it shows, and point the question at the new one;
- add each question you now need.

The user answers in chat, usually as a list matching your latest report:
`2.` is its second question, whatever its number in `ARBOR.md`, and items
left out stay open. When a reply does not fit your latest report, ask rather
than guess. Whenever anything the user says settles an open question, even
without naming it, write that answer after `→` and check it off, so it is not
asked again. Check an item off only when its answer is one you can act on;
anything else stays open and leads your next report. A reply about something
you did is an instruction. When the user defers or skips a question, check it
off and carry on without it (for a defer, `arbor todo add` it first). An
approval answers a review: check it off and merge. Only the user answers
questions, yours or another agent's.

## Escalation

Merge only work you verified yourself. Escalate when verification needs the
user (external services, destructive migrations, visual changes), when the
user asked to see the work first, when questions are still open once
everything else is done, or, absent instructions, when the change is complex
enough that correctness needs a reader rather than a test.

1. Leave something to look at, by **absolute path** (start from
   `arbor path <task>`): a screenshot for anything visual. Ask first if
   producing it is expensive.
2. Write each question not already there under `## Blocked`.
3. `arbor escalate <reason>`, or, when the only thing left is the user's
   approval, `arbor escalate --review "<what to look at>"`, which asks
   `Ready to merge?` for you.
4. Report, end your turn, and wait for the user to answer in chat. Do not run
   `arbor wait` or poll `ARBOR.md`: answers only come in chat. Then
   `arbor claim <task>` to carry on. `arbor retry`, for `budget_exhausted`, is
   the user's to run, before you claim.

## Reporting

However a task ends, say so in one block: a `##` title, a blank line, and one
plain sentence on what changed. The title is the emoji, the outcome, and the
bare task name, then the base for a merge, or otherwise, after a colon, what
it waits on or why it went, led by what it needs from the user (a review, a
decision, access, a test only they can run) rather than the work done, which
is the sentence's job. Keep the title to about eight words, lowercase after
the colon, with no ending punctuation. Anything else worth saying goes
between the sentence and the proposed todos or questions, which end the
report.

```markdown
## ✅ Merged <task> onto <base>

One sentence on what changed.

Stale: todo <id> (remove?).

### 📝 <subject> [#<id>]

What the todo is. Why it is a good next step.

### 📝 <subject> [#<id>]

What the todo is. Why it is a good next step.
```

```markdown
## 🛑 Removed <task>: superseded by a fix on main

One sentence on what the task set out to do.

### 📝 <subject> [#<id>]

What the todo is. Why it is a good next step.
```

A merge or remove report ends with the proposed todos, the best one first;
leave them out only when no todo is open.

```markdown
## ⚠️ Escalated <task>: waiting on your review of the todo board

One sentence on what changed.

1. Does dragging a card feel right on a phone?
   Press and hold a card, then drag it.
   ![dragging a card](/abs/path/drag.png)
2. How should a stale todo be shown?
   - (a) A muted card
   - (b) A "stale" badge
3. Ready to merge?
   Drag a todo at http://localhost:4269
```

An escalation ends with every open question, those left open from earlier
reports first, as a list numbered from 1 whatever their numbers in
`ARBOR.md`. Ask every question you need answered there, never in prose. The
user answers from the report, so each item carries everything needed to
answer it: its subject, and under it the body cut to a line or two, the
choices exactly as in `ARBOR.md` (so a reply of `2. b` names one), and each
screenshot or file by absolute path. Inline a screenshot as
`![what](/abs/path.png)` when your harness shows images in chat; otherwise
link it as `[what](/abs/path.png)`. A review's lines say what to look at and
where. Leave an item bare when its subject says it all.

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
the shape. It is excluded from git: never mention it in a commit message.

## Committing

Plain, human-style messages with **no attribution**: no `Co-authored-by:`,
no "Generated with", no agent or model names, no `--author`. Wanting many
more than 5 commits means the task wants splitting.

Before `arbor merge`, squash to one commit describing the net change, what
the base gains, not the path you took:

```sh
git reset --soft "$(git merge-base <base> HEAD)" && git commit -m "<message>"
```

`<base>` is what `arbor show <task>` prints: trunk unless the task was created
with `--base`.
