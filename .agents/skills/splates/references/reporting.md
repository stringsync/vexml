# Reporting

However a task ends, say so under a `##` title, which the `splates server`
page turns into its card: the emoji, the outcome and the bare task name,
then the base for a merge, or otherwise, after a colon, what it waits on or
why it went. Under it, say briefly what changed for the user, and anything
they must act on or would be caught out without (a restart to pick it up, an
answer you did not follow as given). Keep it to what they would read at a
glance: a line on the change as they will meet it, then at most a few short
points on what matters most, never a tour of every change. Leave out how you
built it (files, functions, tests, the steps you took) and anything the
page, the diff or `SPLATES.md` already says: the task dialog shows the rest
to whoever wants it. A `##` or `###` heading ends the card, so keep any
heading inside it to `####`.

A merge or remove report ends the task, so it asks nothing and offers
nothing: no question, no "Want me to ...?", no list of next steps for the
user to pick from. Each thing you would ask or offer there is a task: queue
it with `splates task add`, or `defer` it when you know too little to groom
it, before you merge or remove, so it waits in the queue rather than on the
user's reply. The conversation already shows each one you queued.

```markdown
## ✅ Merged <task> onto <base>

Cards on a phone now drag on a long press. Restart `splates server` to pick it up.
```

```markdown
## 🛑 Removed <task>: superseded by a fix on main

The task set out to stop uploads retrying a 413.
```

A task blocked on other work is deferred, not discarded: `splates remove
<task> --reason blocked`, then the report below, so the user does not read it
as lost. It keeps `## 🛑 Removed` for work that really ended.

```markdown
## ⏸ Deferred <task>: waiting on the upload rewrite

The task set out to stop uploads retrying a 413; it is back on the list.
```

A merge report names any artifact the task made as `Artifact: <name>`
rather than inlining it.

A turn that ends on questions, with a task open or not, needs no title: say in a line or two where the
work stands, then end with every open question, those left open from earlier
reports first, as a list numbered from 1 whatever their numbers in
a task's `SPLATES.md`, after the demo they ask about, if any. Each item carries what
is needed to answer it: its subject, at most one line of body, the choices
exactly as you wrote them (so a reply of `2. b` names one) with their `Why:`
lines, and each screenshot under the question or choice it shows.

```markdown
The board can now mark a stale task, once you pick how.

1. How should a stale task be shown?
   - (a) A muted card (chosen)
     ![muted card](/abs/path/muted.png)
   - (b) A "stale" badge
     ![stale badge](/abs/path/badge.png)
```

A review asks no numbered question. After what changed comes the demo of
what to check, then a `Checks:` line naming each check you ran that passed,
in backticks, and a `Failed:` line for any that failed for a reason outside
the task, then this last line exactly, which the page needs to show its
Merge button:

```markdown
## 🔍 Ready to merge <task> onto <base>

Old upload links now redirect to the new storage, after a migration that moves every stored file.

### 🎬 Demo: an old upload link

Open http://localhost:4310 (a copy of staging's uploads, nothing of yours).

1. Open `/u/old-link`.
   The file downloads from the new storage.

Checks: `bun run typecheck`, `bun test`

Reply "merge", or say what to change.
```

What you may not do yourself, you ask the user to allow with a permission
card: `## 🔐 Permission: queue lane <n>: <name>`, `## 🔐 Permission: queue
#<n>, #<n>: <what>` or `## 🔐 Permission: remove lane <n>: <name>`, then the
command that does it in a code span on its own line, and a line or two on
what it comes to. The page lists the tasks it queues or removes and gives the
user Now. The queue card ends your reply with work you added (see
[queue.md](queue.md), Asking the user to queue), after any report, a merge or
remove report too. Removing a lane takes its tasks with it, kept to restore,
and an agent may remove only an empty lane. For a lane containing tasks,
ask with the card, naming the lane and how many tasks go. The old `## 📥 Queue ...` titles still read
as queue cards.

Ask every question to the user as an item of a list numbered from 1 at the
margin, outside code blocks, wherever you ask it, even a lone one as
`1. ...?`: only then does the page show it as a card with choices to tap.
Each item's line ends at its `?`, as under `## Blocked`, its body and choices
indented under it.

