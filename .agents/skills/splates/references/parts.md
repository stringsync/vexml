# Handing out part of your task

`splates add <part> --base task/<your task> --goal "<what done means>"` from
inside your tree makes a task that lands on your branch instead of trunk. While parts are out, keep your
tree committed (a part lands by fast-forwarding your checkout), re-read files
before editing them, and squash only after every part has landed. Hand a
part out only when describing it is shorter than doing it.

Agents start agents one level deep, so they never multiply. When another
conversation added the task you work, as an orchestrator or a caller handing
you a part does, `splates add --agent` refuses: do the work yourself, never
through another agent. Your harness's own subagents start none either.

A subagent that may change code works in a part, never its own task on
trunk, so the user reviews one body of work rather than many small ones.
Add the part yourself, then tell the subagent:

- to `splates claim <part>` and work only in the worktree it prints;
- not to escalate, report to the user, or take todos: it is your part, and
  you are the one the user hears from;
- to make each call the request does not settle as it sees fit, listing in
  its reply what it chose and what else it could have done, never under
  `## Blocked`, which would stop `splates merge`;
- to squash and `splates merge` the part when done, landing it on your branch;
- never to wait on you: when the part cannot land until work of yours does,
  to commit it, leave it unmerged, and say so in its reply.

A part's merge runs the tests on your branch, so a part that needs work of
yours, as tests need the fix they test, lands only once that work is
committed. Commit it before handing the part out, or merge the part yourself
when it comes back unmerged: `splates claim <part>` and `splates merge` from its
worktree once your work is in. A subagent your harness runs in the
foreground holds your turn until it returns, so one that waits on you waits
forever.

When the user asks for the part to go to another agent, such as one of
another model family, run by `splates server`, hand it over as you add it:
`splates add <part> --base task/<your task> --goal "<what done means>" --agent
<id> --prompt '<what to do, and the rules above>'`, with `--model <m>`. Read `splates agents` first:
it lists each agent you can name and its models, with what each is good at
and what it costs. Take the agent and model the user names, else the
assignee `splates todo show` gives for the part's todo, else the model whose
strengths fit the part at the lowest cost it is worth, a cheap one for a
mechanical part, and ask about that choice under `## Blocked`.
`splates server` starts that agent in the part's tree, sent `[SPLATES TASK
<part>]` and then your prompt. Its replies never reach you, so have the prompt ask it to list
its calls in the part's commit message, `splates wait <part>` for it to land,
and read them in `git log`.

Write each call it lists under your own `## Assumptions` or `## Blocked`,
as you would your own (see Asking as you go), and redo the part when an
answer overturns one. A subagent that only reads needs no part. When the
user asks for the subagents' work to land on its own, give each one a task of
its own on trunk instead, and let it follow this skill as written. A
subagent of your harness runs with your env, so under `splates server` its claim
of a task on trunk moves this conversation into that task, though a part's
leaves it be: there, hand each one out with `splates add <task> --agent`.
