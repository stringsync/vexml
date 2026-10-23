# Queueing tasks

Writing a task (Queueing tasks), deferring it, asking the user to queue it, and linking,
placing and ordering it. Grooming one, whether you write it, start it or
groom the backlog, is in [groom.md](groom.md). Ordering is the user's (see
Positions).

## Queueing tasks

When something outside your Goal comes up, queue it as a task and move on:
its subject and what you know. `splates task add` makes it ready, which
says you groomed it: you checked no task already asks it, linked what
blocks it, and put it in a lane when its lane is plain (see
[groom.md](groom.md)). When you know too little of it
to do that without looking into it, as for a rough idea or a request
deferred as it came, `splates task defer` it instead, which takes the same
flags and leaves it in the backlog for whoever grooms it. Leave its position
to the user and the queue, unless the user names it. Leave its model off
too, unless the user names one: a task that names none goes to Auto pick,
which judges its words and starts it on the agent, model and thinking level
the user's rules give.

Give each task a `--slug`: a short lowercase-with-dashes name for what it
changes, a few words such as `upload-413`, never the subject cut short. The
task that takes it starts under that name, and its branch, worktree and
conversation carry it.

Write a task's subject short enough to scan. Put the why, the where, the
files and the feature in its detail, as markdown the `splates server` page
renders: paragraphs, lists, `- [ ]` steps, inline code for paths and
commands, and fenced blocks for snippets. Single quotes keep the shell off
the backticks:

```sh
splates task add "Upload retries forever on a 413" --slug upload-413 'The client retries on any 4xx in `src/upload.ts`.

- [ ] stop retrying on 413
- [ ] tell the user the file is too big'
```

The `splates server` page shows each `splates task add` in the conversation as
a line naming the task, which opens it, so your reply needs no heading or
summary of it. That shrinks what you say, never the task: its subject and
detail stay full, since whoever picks it up reads nothing else.

`splates task update <n> '<detail>'` replaces the whole detail, so pass all of
it: what still holds and what you learned.

## Taking a queued task

When you take a queued task that names a model other than the one you run as, take
it anyway: whoever handed it to you chose you. Say so in a line of its own
right after `splates add`, such as `#12 names Sonnet; I run as Opus.`, so the
user can stop you and start the model it names instead.

When `splates add --task` warns that a task is blocked,
what blocks it has yet to merge: `splates task wait <n>` for it, or, when the
user asked for this task now, do only what does not need the blocker and say
so in your report.

Merging removes the queued task yours took: when you leave part of it
undone, `splates task add` what is left as a task of its own.

## Deferring

`[SPLATES DEFER]` asks you to make a request a task rather than do it.
`splates task defer` it as Queueing tasks says, from your worktree when a
task is under way, its detail all the message gives and what you already
know of the code it touches, with no new investigation.

Sent alone, it defers work you may have begun: save it before you stop. Put
what you learned and did on that request since the message in the task's
detail, ticking off the `- [ ]` steps done. When you started a task for it,
commit what its worktree holds, write in the detail that it carries on there
with `splates claim <task>`, and bring `SPLATES.md` up to date, the
`## Next` step it came from saying it is deferred to task #N.

Either way, take no further step toward the request and reply with nothing
beyond the line the page shows for the task; then, after a request, carry on
with any work under way, and, sent alone, end your turn.

## Asking the user to queue

You never change the queue: splates refuses an agent `splates queue add`,
`remove`, `move`, `pause` and `resume`, and `splates lane queue`, `unqueue` and `approve`. The user
queues, from the board or from the queue card your reply ends with.
A queued lane has a budget of tasks it may queue on its own, its tasks
when queued plus 20: tasks you add to it spend it, and at none it stops
until the user approves more, so add only the follow-ups the work needs.

When a conversation asks for several tasks, more than one coherent change,
such as a feature in steps or a list of fixes, add them as a lane rather
than do them all here: `splates lane add '<name>'`, named for what they add
up to, then `splates task add` each into it, groomed and linked as Lanes
says. Leave one change with a follow-up or two to a task and its follow-ups,
and do the change itself when the user asked for it. Then end your reply
with the lane's queue card, naming it by number, and what the tasks add up
to under it:

```markdown
## 🔐 Permission: queue lane 7: Billing export

`splates lane queue 7`

The CSV writer first, then the endpoint and the page's button that use it.
```

When the user asks you to queue a request for a worker, rather than do it,
work out what it wants first: read what you need of the code, and ask each
call their answer would change as [questions.md](questions.md) says, ending
your turn on them, since whoever starts it reads nothing but the task. Then
add it groomed, as Grooming a task you write in [groom.md](groom.md) says,
updating an open task that already asks it rather than adding another, and
end your reply with its card, naming each task by number:

```markdown
## 🔐 Permission: queue #31, #32: Upload fixes

`splates queue add 31 32`

Both stop retries the server already refused.
```

Under its title, give the command that queues it, on a line of its own in
backticks, so a user reading in a terminal can run it themselves.
The `splates server` page lists the work on the card as the board has it,
with that command to copy, and Queue now for the user to press; the choice is theirs and
reaches only the board, never you. Ask for one queue card a reply, at its
end, and leave it at that: whatever the user picks, carry on with any work
under way, and do none of the work on the card in this conversation unless
they ask you to.

## Links

When a task cannot start before another merges, it is blocked by that one:
say so with `--blocked-by` (`splates task add <subject> --blocked-by 12`, or
`splates task update 14 --blocked-by 12`), rather than in its detail. splates
then warns whoever takes it early, drops the link when 12 merges or is
removed, and shows it on the board. Once 12 merges, `splates task show 14`
names the commit it landed as; once it is removed without merging, 14 waits
for the user, and nothing starts it until they let 12 go with
`--remove-blocked-by 12`, which also undoes a link. Several links go in one
call, the flag repeated or a comma list: `--blocked-by 12 --blocked-by 13`, or
`--blocked-by 12,13`.
Link only for a real order (one needs the other's code or data), never for
priority, which is the position's job.

## Lanes

A lane is a named group of related tasks, for the user to see them together
on the board. It orders nothing: the queue starts tasks, and links
alone say what must land first, so link a task `--blocked-by` another
whenever it needs that one's code or changes its files, even in the same
lane. A lane has no model of its own: each task names its own, or Auto pick picks it. Placing a task, read `splates lane
list`, then:

- **An existing lane** when it builds on that lane's work, needing its code,
  files, or context: `--lane <n>` puts it at the bottom.
- **A new lane** when it starts a chain that more tasks will follow, or
  shares a theme with another Untriaged task, such as the same feature,
  area or kind of fix: `splates lane add '<name>'`, named for what they
  add up to, then `--lane <n>` for each. A lane you add for the user to
  queue ends your reply with its queue card (see Asking the user to queue).
- **Untriaged** otherwise, for the user to place: a task that fits with no
  other yet.

After grooming, unmatched work goes to **Backlog** (`--lane backlog`, lane
`0`), the permanent catch-all. Backlog can be queued and worked like any
other lane, but cannot be renamed, removed, or merged away; it stays empty
once its work finishes. Untriaged's Groom button starts the groomer, which
always moves processed tasks to a themed lane or Backlog.

`splates task update <id> --lane <n>` moves one that exists.

The user queues a lane whole, from the board or a queue card: each of its
tasks is queued as soon as nothing blocks it, those added later too, until
the lane is empty. So a task you add to a queued lane starts with no one
asking: the user queued the lane for its work to go on. A task the user
takes out of the queue stays out until queued again. Untriaged cannot be
queued whole.

The order of the lanes, the board's columns left to right, is the user's to
set, like a task's position: only when they ask ("put Licensing first"),
`splates lane update <n> --position <p>`, 1 the first column, then read
`splates lane list` to check the order is the one asked for.

## Positions

Only the user's priorities decide a position, so a new task goes to the
bottom unless they say otherwise:

- "urgent", "next", "before anything else": `--position 1`.
- "fast follow", "right after this", "soon": just below the urgent tasks at
  the top. Read `splates task list` to find the spot.
- "deferred", "someday", "later", "nice to have", or nothing at all: the
  bottom, the default.

To move one that exists ("bump 12", "push the upload one down", "do 7 before
4"), read `splates task list` to turn the ask into a number, `splates task update
<id> --position <n>`, then read the list again to check the order is the one
asked for.

Agents may create empty lanes with `splates lane add` and remove empty lanes
with `splates lane remove`. Removing a lane containing tasks needs the
person's remove-lane permission card. Backlog remains permanent.
