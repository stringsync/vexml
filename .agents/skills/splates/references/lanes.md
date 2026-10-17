# Working a lane

A lane is a named, ordered queue of todos that build on each other, landed
top first, one task per todo, as many at once as their code allows. Lanes are the columns of the `splates server`
board; a todo in none is untriaged. Agents place the todos they add (see
Lanes in [references/todos.md](todos.md)), and the user rearranges them. Each has a
number, which commands and the prompt use, and a name, which says what its
todos are for: `splates lane show N` prints them.

`[SPLATES LANE N]`, copied from the `splates server` page, makes you lane N's
orchestrator, and your job is to burn it down: every todo in it landed, as
soon as the order of their code allows. You do none of its todos yourself:
you hand each to an agent of its own, every one that can go at once, on the
model it names, and keep them moving. Each agent is the user's, not yours:
it works its todo as a task of its own (see Workflow), answers to the user,
asks them its questions, and merges itself. You never relay for it, and it
never reports to you. What you do is see the plan through: what can run in
parallel, what blocks what, and which tasks out would conflict. Each lane
you are sent adds more to it. The lane is splates's, not the prompt's, so
read it from splates each time.

Once you have first read the lanes you were sent, before handing anything
out, say so in a message of its own, which the `splates server` page shows as a
card, and beside the thread until your finished report: a `## 🌱 Started lanes` title with the
lanes' names as the board shows them, a blank line, and one or two lines on
what they add up to. A lane you are sent later gets a Started card of its
own; placing the untriaged todos, start the lanes you placed them in.

```markdown
## 🌱 Started lanes Stats, Licensing

Make the Stats page say what to act on, then renew licenses on their own.
```

The page shows your plan in your latest working report, live from splates:
a board of each lane's todos to do, those under way with how each agent
stands, and those landed. So you change the plan by changing the lanes:
`splates todo update <id> --position <n>`, `--blocked-by <id>` or `--lane
<n>` (see [references/todos.md](todos.md)), never by writing it out.

## Handing out

1. `splates lane show N` prints the steps and who is on each. When it says the
   lane is done or gone, done by your agents or by ones you never started,
   say so in your next report. Once every lane you work is, end on a
   finished report (see Reporting on lanes), so the `splates server` page shows
   you as done.
2. Check each todo a task has taken, with `splates show <task>`, as for
   `[SPLATES IDLE <task>]` below: an agent that sits idle with nothing
   waiting on the user gets told to carry on. Do this when you start and
   when you resume; after that, splates tells you of each change.
3. Hand out every todo no task has taken that can go now. One has to wait
   when `splates todo show` links it `--blocked-by` an open todo, in any lane,
   when its detail says it needs the code of one still out, or when it
   would change the same files as a task out (`splates list --files`), which
   would cost both a hard rebase. A lane's todos build on each other, so
   read each one's detail for what it needs, not only its links. When you
   find such a need that no link says, link it, so the plan shows it.
4. To hand one out, `splates todo show <id>` names its agent and model; when
   it names none, pick one as for a todo you add (see Todos), and say which
   in your report as `- Assumed: <what>`. Then `splates add <task> --todo
   <id> --agent <a> --model <m> --prompt '<what>'`, where `<what>` holds
   what the todo's detail does not and the lane taught you: names chosen,
   files moved, answers the user gave, what the tasks out beside it are
   changing. `splates server` starts the agent, nested under you on the page.
   When `add` stops on `agents_full`, you have as many agents out as
   `agentsPerAgent` in `splates.config.ts` allows one agent: hand out nothing
   more, and
   say in your working report what waits for room, since each todo that
   lands frees one. Pass `--over-capacity` only when the user asked, in so
   many words, for more agents at once than that; a lane's size or urgency
   is never their consent.
5. Once nothing more can go out, end your turn on a working report (see
   Reporting on lanes). Never wait, sleep or poll for your agents: splates
   wakes you with a directive whenever a todo in your lanes is done or open
   again, and only then do you act.

A task you handed out in another project comes back named `<slug>/<task>`:
run each command below on it as `splates --project <slug> <command> <task>`.

## What wakes you

Your agents never report to you: splates watches the todos in your lanes and
tells you what became of each, however it came about, by your agent, another
conversation or an external one. Each arrives as a message from the user
would, once per change.

`[SPLATES TODO DONE #N]` means todo N left the list: its task merged, or it
was removed. Read in `git log` what landed, then go back to step 1 of
Handing out for its lane: what it held back may go out now, and what landed
may change what the rest need, which you pass on in their `--prompt`, or to
one out with `splates tell`.

`[SPLATES TODO OPEN #N]` means todo N is open again: the task that took it
released it or was removed. Go back to step 1 of Handing out for its lane,
which hands it out again once it can go; `splates todo show N` says what the
last task learned.

A task that escalates wakes you for nothing: it waits on the user, who
answers it in its own conversation, and what needs it waits too.

A task you handed to another project holds no todo in your lanes, so its
agent reports instead: `[SPLATES REPORT <slug>/<task>]` means it stopped,
escalated, merged or removed. Read `splates --project <slug> show <task>`,
once per stop, and when it is gone, go back to step 1 of Handing out as for
a todo done.

`[SPLATES IDLE <task>]` means the agent you handed `<task>` out to ended a
turn, failed, or was stopped by a restart, without escalating, merging or
removing it, and the user has not taken it in hand since: nothing more will
come unless you act. Read `splates show <task>`. When it is gone, treat it as
a report of its landing or removal. Otherwise `splates tell <task>` it to
carry on as the splates skill says, ending in `splates escalate`, `splates merge`
or `splates remove`, which wakes it. The second time a task comes back idle
with nothing changed, stop telling it, and ask the user in your next report
what becomes of it:

```markdown
1. What should become of <task>, which keeps stopping on <what>?
   - (a) Hand it to another model: remove the task and hand its todo out again (chosen)
   - (b) Leave it for you to take up in its conversation
   - (c) Remove the task and leave its todo for later
```

`[SPLATES LANES DONE]` means no lane you work is left on the board: its
last todo landed, by your agent, another conversation or an external one,
while your last report still said it was under way. Read `splates lane list`
and `splates list` to be sure, then end on your finished report (see Reporting
on lanes), so the page shows you as done.

Never answer an agent's questions, or tell it anything the user said to it:
it is theirs. A todo the user moved, linked or edited while you worked
shows in the next `lane show`.

## Changing course

The user may tell you to change course on a lane or several: drop a todo,
take another approach, undo what landed. You know the body of work, so act
on it with what fits:

- `splates tell <task> --stop '<what changed>'` stops an agent's turn and
  tells it the new plan, as the user would.
- `splates remove <task> --reason <why>`, run once its agent is stopped,
  drops a task, putting its todo back; `splates todo remove <id>` drops the
  todo too.
- Work that already merged comes back out with a revert: hand it out as a
  task of its own, as for any todo, or, when it reverts cleanly, revert it
  yourself in a task you add with no `--agent`.

Then update the lanes so the plan says what is next, and end on a working
report.

`splates server` starts the agents you name, and sets `$SPLATES_CONVERSATION` in
yours; without it, nothing will start one. Hand each todo to a subagent of
your own harness on the model it names instead, told to `splates claim
<task>` and work it as the skill says, or, when your harness cannot run
that model, work it yourself, saying so as for any todo that names another
model. A subagent of your harness answers to you, so its questions come
back to you: ask the user them in your report, and send their answers back
in a message to it. Nothing wakes you for it, so `splates wait <task>` on it
in place of its report, and stop it once its task is gone.

Before a finished report, read `splates list` for any task you handed out
still there, and see it to its end, or ask the user what becomes of it.

Never hand out a todo from a lane you were not sent.

## Reporting on lanes

A lane orchestrator reports on its lanes in the reply that ends each turn:
the user reads its agents' own questions in their conversations, so this
says only where the plan stands.

Whenever it ends a turn with a task it handed out still at work or waiting
on the user, it ends on a working report: `## ⏳ Working lanes`, the names
of the lanes it works, and after a colon, the tasks out, then a `####`
line, one sentence on what landed since its last report and what lands
next, and a `- ` line per lane on what it waits on, naming any task that
waits on the user. The page shows each todo beside it, so say only what the
plan does not: why something waits, a conflict you held back, a change of
course. Say nothing before it in the turn, neither what landed nor what
went out.

Like a task agent's assumptions, each call it makes is said once, in the
report that ends the turn it made it in, after the lane lines: a
`- Assumed: <what>` line for each model it picked for a todo
that named none, each lane it named, and each link it added. Its own
questions, such as what becomes of a task that keeps stopping, end it, as
an escalation ends with them.

```markdown
## ⏳ Working lanes Stats, Licensing: on stats-breakdowns-clear, licensing-renew

#### #154 merged as stats-totals-first, so the breakdown tables went out.

- Stats: #160 waits on #155, out as stats-breakdowns-clear, which waits on you.
- Licensing: #172 out as licensing-renew; #173 holds back, as it renames the same files.
- Assumed: Haiku for #172, which named no model, as a mechanical rename.
```

Once every lane it works is done, it ends on one report for them all, the page's sign that it is
done: `## 🏁 Finished lanes` and the lanes' names as the board shows them,
then one sentence on what they added up to, and a `- ` line per lane on what
became of each todo, including those another agent took and landed. It ends
with the proposed todos, as a merge report does.

```markdown
## 🏁 Finished lanes Stats, Licensing

The Stats page leads with what to act on, and licenses renew on their own.

- Stats: #155 merged as stats-action-oriented; #152 and #160 landed by another conversation.
- Licensing: #171 and #172 merged; #173 removed as moot.
```
