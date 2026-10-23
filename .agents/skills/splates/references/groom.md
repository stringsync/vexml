# Grooming tasks

A task is ready once groomed: no other task asks it, what blocks it is
linked, and it is in its lane when that is plain. Whoever writes a task
grooms it as they add it with `splates task add`, which makes it ready, or,
knowing too little of it, `splates task defer`s it to the backlog, rough. A
backlog task is groomed later, by the project's groomer or the agent that
starts it, which `splates task update N --ready` moves to ready. Linking and
placing are in [queue.md](queue.md); this file is what grooming checks, and
who does it when.

## Grooming a task you write

Before `splates task add`, check none already asks it (see One that already
asks it), give it `--blocked-by` for each task whose code it needs or whose
files it changes, read from `splates task list` and `splates list --files`,
and `--lane` when it builds on a lane's work (see Lanes in [queue.md](queue.md)). When any of that
needs looking into code you have not read, `splates task defer` it instead.

## Grooming a task you start

A task from the backlog, which `splates task show N` shows as `groomed: no`,
is groomed once, by the agent that starts it, before any work on it. A ready
one was groomed when it was written: start work on it.

1. **One that already asks it.** When an open task asks the same, fold what
   yours adds into that one's detail and `splates remove` yours, as below.
   When one asks the opposite, or yours would undo work already merged or
   go against a call the code made (`git log` on the files it touches),
   ask the user which stands before building either way.
2. **Link what blocks it**, read from `splates list --files`: `splates task
   update N --blocked-by <id>` when it needs another task's code or data, or
   would change files another task changes, never for priority. When it
   links a task still open, `splates remove` yours, which puts it back, so
   it starts once that lands.
3. **Ask what the user's answer would change**, under `## Blocked`, as
   [questions.md](questions.md) says, each conflict from step 1 among them, and
   each question its detail holds under `#### Questions from grooming` or
   `#### Open questions` that it does not already answer; make every other
   call yourself.
4. **Mark it groomed** with `splates task update N --ready`, so it goes back
   to ready rather than the backlog should it be let go.

## One that already asks it

Before adding a task, scan `splates task list`, leaving off `--open`, by
subject alone: it prints one line per task and no detail. When one or two
subjects look like the same request, `splates task show` just those. Reuse
a list you read this task when little has happened since, rather than
reading it again.

- **Open, the same request**: add none. `splates task update` its detail with
  what you know, keeping what still holds, and name it as the task you meant.
- **Taken by another task**: add none, and note in `SPLATES.md` what you would
  have added, so that task's Goal in `splates list --files` can be checked
  against it.
- **Only near it**: add yours, and link it `--blocked-by` that one when it
  needs that one's code.

## The project's groomer

`[SPLATES GROOM #N]` comes from `splates server`: you are the project's
groomer, and task N waits in the backlog, deferred rough, for you to
organize. splates claimed it for you, and tells you of the next once your
turn ends, one directive a turn, in this same conversation. Once the
backlog is empty, `[SPLATES SORT ...]` asks you to find lanes for
Untriaged tasks, as Sorting Untriaged says. When neither holds any more,
splates archives the conversation and stops you; the next run starts a
conversation of its own, with a fresh context.

You organize tasks and never do them. You work in the main tree, change no
code, and start, merge and queue nothing: splates refuses you `splates add`,
`merge`, `queue add` and `lane queue`. Each task is a little reading and a
few `splates task` commands, then your turn ends.

1. **Look at it.** `splates task show N`. When it is gone, taken, or
   `groomed: yes`, someone made its calls first: leave it. Should someone
   take it while you work, splates refuses your changes to it; leave it then
   too. When its detail holds `#### Questions from grooming`, a groomer
   before you asked them: those the user has answered since, in this
   conversation or in its detail, fold into it and go on; while any is open,
   leave it as it is.
2. **One that already asks it.** Scan `splates task list` by subject, and
   `splates task show` those that look like the same request, as One that
   already asks it says. When an open one asks it,
   fold what N adds into that one's detail (`splates task update <id>
   '<detail>'` replaces it, so pass all of it), then `splates task remove
   N`, and you are done with N. One only near it gets what N knows that it
   lacks, and a link at step 5 when one needs the other's code.
3. **Split one too big** into tasks of the right size, each one coherent
   change a single task lands: `splates task add` each part with all N said
   of it, linking a part that needs another's code `--blocked-by` it, then
   `splates task remove N`, and groom each part as below. One you cannot
   split stays whole.
4. **Look into it lightly**: the searching whoever takes it would start
   with, and no further. Find the files and code it touches, with `rg` and
   reads, and the tasks it relates to and those that block it, from
   `splates list --files`. Note what you found in its detail under a
   `#### From grooming` heading, with paths and line numbers, or attach a
   longer note with `--file`, and say there that the notes date from
   grooming, on today's date, and may be stale by the time it starts, for
   its agent to check rather than trust. Only enough to judge what it
   relates to and what blocks it, and whether it conflicts with what is
   there: never a plan or a fix. Read `git log` for the files it touches,
   and the merged tasks they name, so you notice when it would undo work
   already landed or go against a call the code or a past task made.
5. **Link what blocks it and place it**, as Links and Lanes in
   [queue.md](queue.md) say: `--blocked-by <id>` for each task whose code
   it needs or whose files it changes, read from `splates list --files`,
   never for priority, and `--lane <n>` when it builds on a lane's work.
   When it shares a theme with an Untriaged task instead, `splates lane
   add` a lane for them and move that one into it too. When no themed lane
   fits, use `--lane backlog`: the permanent catch-all lane for deferred work.
6. **Mark it ready**, last and in one `splates task update N '<detail>'
   --blocked-by <id> (repeated per id) --lane <n> --ready`. Pick no agent, model or
   thinking level, which are triage, and leave its position, which is the
   user's.

### Conflicts and open questions

The groomer makes every call a revert would undo itself. It asks the user,
rather than mark it ready, when N:

- asks the opposite of another task, open or under way;
- would undo work already merged, or go against a call the code or a past
  task made, which step 4 turns up;
- is too unclear to organize: you cannot tell what it asks, so not what it
  duplicates, splits into or touches.

Leave it in the backlog, unmarked, and ask the user as numbered questions
in your reply, as [questions.md](questions.md) says, naming the task or commit
each conflict is with. You have no `SPLATES.md`, so write the same questions
into its detail under a `#### Questions from grooming` heading, keeping the
rest, so they outlive this conversation: a later groomer, or the agent that
starts it, finds them there. Once the user answers, fold the answers into
its detail, drop that heading, and groom it.

A task clear enough to organize can still leave open what it should do: a
behavior or design the user will see, a default they may want another way.
Those are not yours to settle, and need not hold it in the backlog: mark it
ready, with each such question in its detail under `#### Open questions`,
for whoever takes it to ask the user before building on a guess.

### Sorting Untriaged

`[SPLATES SORT #N ...]` comes once the rough backlog is empty: the tasks it
names wait ready in Untriaged, including any an older groomer left there.
splates marks them looked at before the turn. One at a time a task
shows no theme it shares with others; here you see them together.

1. **Read the board.** `splates lane list`, then `splates task list`,
   reading each lane's tasks and Untriaged by subject; `splates task show`
   only those whose subject leaves their theme unclear.
2. **Place each one named**, as Lanes in [queue.md](queue.md) says: into a
   lane whose work it builds on, `splates task update <id> --lane <n>`, or,
   with each other Untriaged task it shares a theme with, named or not,
   into a lane you `splates lane add` for them. Two tasks are enough for a
   lane. Move any that fit with no other into Backlog with
   `splates task update <id> --lane backlog`. Never leave a processed task
   in Untriaged. Backlog can be worked and queued like other lanes, but
   cannot be renamed, removed or merged away, even when empty.
3. **Change nothing else**: no detail, link, position or readiness, and no
   task taken, which splates refuses you. No queue card either: the user
   queues lanes from the board.

### Replying

Reply with one line per task on where it went, such as `#12: ready in lane 3
Stats, blocked by #9`, `#13: folded into #8`, `#14: split into #15 and
#16`, `#17: left in the backlog on the questions below` or, for a sort,
`#18 and #19: into new lane 4 Auto pick`, then those questions, and nothing
more, then end your turn. Never wait, sleep or poll for the next task:
splates tells you.
