# Demos and artifacts

## Demos

The norm is evidence, not a demo: the user reads what you verified under
`## Verification` in the task dialog, and starts a demo from there only when
they want one. Start one yourself only when the user must see something to
answer a question, or to judge a review (see [Merge or review](merge.md#merge-or-review)). A demo is a
`### 🎬 Demo: <what it shows>` heading, a line on where to open it, then the
steps, numbered from 1. Each step's line is one thing to do; indented under
it, one line on what they should see, and a screenshot or recording only
where words fall short. The `splates server` page shows a demo as a card of
its steps, with a button that opens where it runs.

```markdown
### 🎬 Demo: dragging a card on a phone

Open http://localhost:4310 at 390px wide (a demo repo, nothing of yours).

1. Press and hold a card.
   It lifts after half a second.
2. Drag it to another lane.
   It lands where you drop it.
   ![dropped in Doing](/abs/path/drop.png)
```

Give one demo per message: right before the questions it is for, or inside a review before its last line. The steps
are the demo's only numbered list: never number steps elsewhere in a report,
where they would read as questions.

## Hosting a demo

When the user has to try a change before it lands, make that cheap: run it
for them where they can open it (a dev server on throwaway data that shows
each case, never their own), and give them a demo (see [Demos](demos.md)). Run splates in a
throwaway repository with `SPLATES_HOME` set to a throwaway directory, so it
stays out of the user's `splates server` project list. Start the server from your
worktree, then `splates ports <task>` prints each port it listens on with two
links: its remote one, `https://<task>-<port>.<base>` behind the user's
Access, when `splates server --ports-host` saved a base, and its local one on
your machine, which a worker whose server runs elsewhere has only for its
own ports. Give the user both, the remote one first, in
the demo's line on where to open it; the task's dialog on the page lists
them too. When `splates tunnel status`
shows a tunnel, `splates server --slot` from your worktree does both and prints a
`https://<word>.<zone>` the user can open on their phone too: give them that.
Your worktree keeps its slot until the task merges or is removed, which stops
its server; that stops nothing else, so before merging, stop every process
you started in the worktree yourself, such as a dev server in the background. Every other slot is another task's: never kill its server or edit
`~/.splates/slots.json`, even when it looks left behind. When none is free, run
`splates slots prune`, which frees only those no task holds any more, and
otherwise ask the user.

## Running a demo

`[SPLATES DEMO <task> <point>]` asks you to show `<task>`, open or finished,
at one point: `after` its change, as the task dialog's Demo with an agent and
the merged card's Demo it ask, or, when asked for by hand, `before` it or on
`main` as it is now. The task dialog's starts a new conversation and the
merged card's comes to the agent that merged it; either way, read the task
first with `splates show <task>`, which prints a finished task's facts and
the `SPLATES.md` it ended on too.

1. `splates add demo-<task>-<point> --goal "Demo <task> at <point>"`, with
   `--base task/<task>` for `after` while the task is open, so the demo runs
   in a worktree of its own that nothing landing on main moves.
2. Move it to the point: for a finished task, `git reset --hard <commit>^`
   for `before` and `git reset --hard <commit>` for `after`, `<commit>` the
   one it landed as. `main`, and `before` while the task is open, stay where
   `splates add` put them. This reset is yours to run: a demo task never
   merges.
3. Set it up as the task's `## Demo` says, on throwaway data, and start it
   where the user can open it (see [Hosting a demo](#hosting-a-demo) on servers and links).
4. Say in a line what they should see at this point, then give the demo's
   steps, and talk it through. A fix it turns up is work for the task, while
   it is open, or for a new task, never for the demo's.

The demo stays up until the user archives the conversation, which removes
the demo task and stops its server and agent.

## Artifacts

Use artifacts proactively when the conversation warrants something the user
can explore or return to, especially HTML artifacts: an interactive
explanation, a comparison of options, a diagram with details to inspect, or
a small tool for trying scenarios. Do not wait for the user to ask for an
artifact when one would make the work easier to understand or judge. Choose
one when its visual structure or interaction adds value, rather than for
every reply.

Screenshots remain the first choice for showing what the actual UI looks
like, with recordings for behavior over time. An HTML artifact can complement
that evidence with an explanation or exploration; label a mockup or
simulation as such so it is clear what the user is seeing.

An artifact is a file the user will come back for after the task is gone: a
screenshot or recording of the finished work, an HTML page, a generated
document. It belongs to the conversation, not the task, so it outlives every
task the conversation runs, and the `splates server` page lists the conversation's
artifacts beside its thread. It opens an image or a recording in its
lightbox, an HTML page in a frame that runs its scripts but loads nothing
else, so make a page one file with its styles, scripts and images inline,
and offers anything else as a download. Keep one with `splates artifact add <file>`, named
for its basename, or `--name <name>` for another. Adding a name the
conversation already holds makes that artifact's next version, the earlier
ones kept until cleanup takes them, so give one thing one name and add it
again whenever it changes,
rather than a new name per take. `splates artifact remove <name>` once it no
longer stands, as when the work it shows was redone or dropped; `splates
artifact list` and `splates artifact show <name>` read them back. It needs a
conversation: `$SPLATES_CONVERSATION` from `splates server`, or
`--conversation <id>` from outside it.

Most files you show are not artifacts: a screenshot that shows a question, an
image in a report's card, a demo step's image. Each serves the moment it is
shown in, so it stays inline: `splates attach` it and name it as
`![what](/abs/path.png)`, as [Questions](questions.md) and [Demos](#demos) say.
Make a file an artifact only when the user would look for it on its own,
apart from the reply it came in.

When `splates artifact add` stops on `too_large`, or the user asks about
artifact space, read [artifacts.md](artifacts.md).
