# Questions and answers

Ask the user whenever their answer would change what you build: one reading
of an ambiguous ask, a behavior or design they will see, a default they may
want another way, a call a wrong guess would cost much rework to undo, one
hard to reverse (a migration, data written, a message sent, anything outside
the repo), or one that goes against something the user said before. Asking
is cheap, so when in doubt, ask: the `splates server` page shows your
questions as a card with your pick already chosen, so the user answers with
a tap, and you carry on with that pick meanwhile rather than wait.

This holds in every conversation in a splates repository, with a task open
or not: a design talk in the main tree asks the same way a task does. A task
only adds the record of its questions under `## Blocked` (see In a task).

Make the rest yourself, the calls the user would not care to weigh in on: a
name only the code reads, a helper's shape, a log line. Take the better pick
and carry on, saying nothing of it to the user; in a task, write it in a line
under the `## Next` step it concerns only when whoever resumes the task would
need it; otherwise the conversation and commits hold it.

Ask in your reply, as [Reporting](reporting.md) says, in the format below and
nowhere else: a numbered list, a lone question numbered `1.` too, so the page
shows its question card. Put every question there, even one raised in
passing: the page shows none asked in prose, a bold line or a "my lean", or
through your harness's own question tool. When an answer overturns a pick you built on, redo
that part.

Number questions 1, 2, … in the order you write them. A question's line is
its subject, short enough to scan and ending at its `?`, with nothing after
it; everything else, the why included, goes in markdown lines indented under
it, code blocks included. When checking your own work, ask for what is wrong
rather than a bare yes or no. A yes or no decision is one of a few: give it
`- (a) ...` choices, each saying what happens, never a bare "Yes" or "No", so
the answer cannot be read two ways. When the answer is one of a few, end with
`- (a) ...` lines (pick one, or none), or `- [a] ...` lines for all that
apply. Describe every choice, the one you went with too, and mark that one
`(chosen)`: never a bare "That". List it first, as `(a)`: the `splates server`
page puts it first and picks it for the user, who answers by changing it. When the answer is an order (what lands first, which task
matters most), end with `- a. ...` lines in the order you would go with: the
reply lists every letter in the order picked, `4. b, a, c`.

When the pick is a close call, or the user may well want another,
give a choice a `Why:` line indented under it: one sentence on why you would
take it, or why not. Any choice can have one, the `(chosen)` one most often;
leave it off where the choice says it all. The `splates server` page hides every
`Why:` line until the user asks to see a question's reasons, so they never
crowd the choices.

```markdown
1. Should the old upload endpoint stay for a release?
   - (a) Keep it for one release, logging each call (chosen)
   - (b) Remove it now
2. What looks wrong in the header at 390px?
   ![header at 390px](/abs/path/shot.png)
3. How should existing sessions move to the new tokens?
   Sessions are keyed by the old cookie.
   - (a) Migrate each session on its next request (chosen)
     Why: no one is signed out, and the old cookie still reads for a release.
   - (b) Sign everyone out once
4. In what order should the settings pages land?
   - a. Profile
   - b. Billing
   - c. Notifications
```

Show what a question is about whenever it is something to see: a screenshot,
or a short recording when it moves or takes steps. Save it outside the
worktree, `splates attach` it, and name the path it prints as
`![what](/abs/path.png)`. The `splates server` page shows an attached file inline,
in `SPLATES.md` and in your replies alike, playing a `.mp4`, `.webm` or `.mov`
as a video. Only attached files show there, so never point a question at a
file anywhere else. `splates attach` keeps a file with a task, so a question
with no task open that needs one to look at starts the task first
(`splates add`). Attached from a conversation (`splates server` gives its agents
one; an agent outside it passes `--conversation <id>`), a file stays with it
past the task, so the question still shows it when the user scrolls back;
attached outside one, it goes when the task does. Either way, one the
`SPLATES.md` it ends on shows is copied to keep with the finished task, so
its record goes on showing it. Such a file is no artifact
(see [Artifacts](demos.md#artifacts)): it serves the question it is in.

Put each screenshot in the question it is for, under what it shows: under the
question's line for what it asks about, or indented under a choice for what
that choice looks like, which the `splates server` page shows with the choice.
Never gather them above the questions, or ask about them apart from the
question they are for.

```markdown
6. Which style should the action list take?
   - (a) A rail beside the thread (chosen)
     ![rail](/abs/path/rail.png)
   - (b) A bordered panel
     ![panel](/abs/path/panel.png)
```

## Reading a reply

The user answers in chat. From the `splates server` page, a reply quotes each
question it answers, its line in bold (`> **How should …?**`), and answers
under it: the choices picked as `- (b) <its text>`, numbered in the order
picked for an order, then any words. Anything else they say comes before the
first quote. Match each quote to an open question by its line, whatever its
number; questions not quoted stay open. In a task, a quote can come from
`SPLATES.md` as the page last read it, ahead of your report: when it matches
no question you have open, as one you changed since, ask again rather than
guess what it answers. Typed by hand, a reply is a list matching your latest
report: `2.` is its second question, whatever its number in `SPLATES.md`, and
items left out stay open. When a reply does not fit your latest report, ask
rather than guess. Anything the user says can settle an open question without
naming it; an answer that is not one you can act on leaves it open, to lead
your next report. A reply about something you did is an instruction.

## Without a task

A conversation with no task, such as a design talk or a question answered
from the main tree, asks exactly as above, and its answers live in the
conversation: there is no `SPLATES.md` to record them in. Ask, end your turn,
and read the user's reply as Reading a reply says. When the talk turns into
work, `splates add` it, then write each answer that shapes the work under
`## Blocked` as a checked question with its answer, and each question still
open there as unchecked, numbered as you asked it, so the task carries on
from what the conversation settled.

## In a task

A task asks the same way, and writes each question under `## Blocked` in
`SPLATES.md` too, before the reply that asks it, so the record outlives your
session. The task cannot merge until each is answered, though you carry on
with your pick meanwhile and the user can answer in chat while you work.
Questions keep their numbers there: numbers never change, and new ones
continue from the highest, while each reply lists the open ones from 1 as
[Reporting](reporting.md) says.

```markdown
## Blocked

- [x] 1. Should the old upload endpoint stay for a release? → a
  - (a) Keep it for one release, logging each call (chosen)
  - (b) Remove it now
- [ ] 3. How should existing sessions move to the new tokens?
  Sessions are keyed by the old cookie.
  - (a) Migrate each session on its next request (chosen)
    Why: no one is signed out, and the old cookie still reads for a release.
  - (b) Sign everyone out once
```

An answer can reach you mid-turn, as a message that arrives while you work.
Read it at the next step rather than at the end: record it (see Keeping
Blocked current), and redo at once what it overturns, before building more on
the choice. While a question is open, do the work it touches last where your
plan allows, so an answer that overturns it costs little.

### When you cannot go on

When questions are still open once everything else is done, or you cannot go
on without the user (access, a decision, a test only they can run), stop and
ask. A secret, such as an API token, is a cred to request instead (see
[creds.md](creds.md)).

1. Leave something to look at, by **absolute path** (start from
   `splates path <task>`): for anything visual, a screenshot or recording you
   `splates attach`. Ask first if producing it is expensive.
2. Make sure each question is under `## Blocked`.
3. Ask them in your reply as [Reporting](reporting.md) says, and end your turn: the page
   shows you waiting on the user. Do not `splates wait` or poll `SPLATES.md`:
   answers only come in chat. A new session resumes with `splates claim <task>`.

Never ask whether the work is ready to merge: once the questions are answered
and the work is done, merge or ask for a review (see [Merge or review](merge.md#merge-or-review)).

### Keeping Blocked current

`## Blocked` is where every question the user sees comes from, so it must say
what you need right now. Before you continue with any work (after the user
replies, after `splates claim` returns, and between steps), bring it up to date:

- write every answer the user gave after `→` on its question's line, and
  check off each question you have acted on;
- write a follow-up to an answer, even a checked one, on a `→ ` line of its
  own under the question, and uncheck the question until you have acted on
  the follow-up;
- check off any question that no longer applies, with why after `→`
  (`→ moot: the header was removed`), rather than deleting it;
- retake each screenshot an open question shows once your work has changed
  what it shows, attach it in place of the old one (`splates attach new.png
  --remove <old path>`), and point the question at the new one;
- add each question you now need.

Whenever anything the user says settles an open question, even without
naming it (see Reading a reply), write that answer after `→` and check it
off, so it is not asked again. Check an item off only when its answer is one
you can act on; anything else stays open and leads your next report. When the
user defers or skips a question, check it off and carry on without it (for a
defer, `splates task defer` it first). Only the user answers questions, yours
or another agent's.

When the user asks to see the work before it lands, add an unchecked
`- [ ] Show the user before merging` step under `## Next` at once, so the
request outlives your session and holds the merge until they approve. Check
it off only when the user approves the review.

