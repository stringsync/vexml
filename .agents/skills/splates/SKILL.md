---
name: splates
description: Use the splates CLI to land your work on trunk, or a base branch given as an argument, from an isolated git worktree without pull requests. Read this before investigating anything that may lead to a code change in a splates repository, since it decides where the work happens, and whenever you need to add, claim, merge, remove, list, show, locate, escalate, or defer a task, or add, pick up, link, or reorder a todo, or work down a lane of them.
version: 0.0.45
---

# Using splates

`splates` runs many agents on one repo, each in its own git worktree, landing on
trunk without pull requests. Run it with `bunx @stringsync/splates <command>` (or
`splates` if on PATH). `splates --help` explains the commands; this file covers
only what the CLI cannot tell you.

A bare `splates` prints help; start the server explicitly with `splates server`.
`splates dev` is only for developing the splates repository, through its
checkout's `bin/splates`; it is not a command in the published CLI.

**Rule:** never use raw git for state transitions splates covers: every landing
goes through `splates merge`. The exception is finishing a rebase left in
progress (`git add`, `git rebase --continue`), then merging again. A failed
command prints `{reason}` JSON on stdout and instructions on stderr: do what
stderr says.

## Directives

A prompt that starts with `[SPLATES ...]` comes from the `splates server` page or
from splates itself, and asks what the table says. A row that names a file
asks you to read it as Reference files says.

splates was arbor until this release: a `[ARBOR ...]` prompt is the same
directive, and an `ARBOR.md` in your worktree is the task's `SPLATES.md`.

| Directive | What it asks | What to do |
| --- | --- | --- |
| `[SPLATES TODO #N]` | Take todo N | `splates todo show N` prints what is asked; if it names another task that took it, tell the user rather than start on it. Otherwise take it now, so no other agent starts on it: `splates add <task> --todo N`, or `splates todo take N` from a task under way |
| `[SPLATES TASK <task>]` | Resume a task | `splates claim <task>`, read its `SPLATES.md`, and carry on from where it stands |
| `[SPLATES SETUP <step>]` | Walk the user through one step of setting splates up, from the Setup page | [setup.md](references/setup.md) |
| `[SPLATES HANDOFF <task>]` | Take over a task another agent handed you | [handoff.md](references/handoff.md) first, then as for `[SPLATES TASK <task>]` |
| `[SPLATES HANDOFF TO <agent> <model>]` | Hand your task to that agent, on that model | [handoff.md](references/handoff.md) |
| `[SPLATES MERGE]` | The user approved your review, from the Ready to merge card | As for a reply of "merge": see Merge or review |
| `[SPLATES APPROVE]` | The user approved your proposal, from its card, with any answers after it | As for a reply of "approve": see Proposing |
| `[SPLATES DEFER]` | Make the request after it a todo rather than do it; alone, make the user's message before it one, and stop | Read [todos.md](references/todos.md), then `splates todo add` the request as Todos says, from your worktree when a task is under way, its detail all the message gives and what you already know of the code it touches, with no new investigation. Sent alone, it defers work you may have begun: save it before you stop. Put what you learned and did on that request since the message in the todo's detail, ticking off the `- [ ]` steps done. When you started a task for it, commit what its worktree holds, write in the detail that it carries on there with `splates claim <task>`, bring `SPLATES.md` up to date, and `splates escalate "deferred to todo #N"`. Either way, take no further step toward the request and reply with nothing beyond the line the page shows for the todo; then, after a request, carry on with any work under way, and, sent alone, end your turn |
| `[SPLATES UPDATE]` | Where your work stands, from the Check in button | Bring `## Done` and `## Next` up to date, then, before any other tool call, answer in at most three `- ` lines: what you finished since the user last heard from you, what you are on now, and what is in the way, if anything. Write them as your reply even when this comes in mid-turn: your thinking and `SPLATES.md` do not count. Then carry on with the work in the same turn: no further report, no questions and no stop |
| `[SPLATES LANE untriaged]` | Orchestrate the todos in no lane | Working the untriaged lane below first, then [lanes.md](references/lanes.md) as it says |
| `[SPLATES LANE N]` | Work down lane N as its orchestrator | [lanes.md](references/lanes.md) |
| `[SPLATES REPORT <task>]` | A task you handed on with `--relay`, or to another project, stopped: escalated, merged or removed | [handoff.md](references/handoff.md); for another project's, [lanes.md](references/lanes.md) |
| `[SPLATES TODO DONE #N]` | A todo in a lane you orchestrate left the list: merged or removed | [lanes.md](references/lanes.md) |
| `[SPLATES TODO OPEN #N]` | A todo in a lane you orchestrate is open again: its task let it go or was removed | [lanes.md](references/lanes.md) |
| `[SPLATES IDLE <task>]` | A task you handed out sits still: its agent's turn ended, or failed, short of a stop | [lanes.md](references/lanes.md); for a task you handed on with `--relay`, [handoff.md](references/handoff.md) |
| `[SPLATES STOPPED <task>]` | The user terminated the agent of a task you handed on with `--relay` | [handoff.md](references/handoff.md) |
| `[SPLATES LANES DONE]` | Every lane you orchestrate is done, however its last todo landed | [lanes.md](references/lanes.md) |
| `[SPLATES HEARTBEAT]` | Check on the task you handed on with `--relay` and say where it stands | [handoff.md](references/handoff.md) |
| `[SPLATES CHECKPOINT]` | Bring `SPLATES.md` up to date and stop, as before a restart | [checkpoint.md](references/checkpoint.md) |
| `[SPLATES RESUME]` | Carry on from where `SPLATES.md` says you stopped | [checkpoint.md](references/checkpoint.md) |
| `[SPLATES RECONNECT]` | A lost connection cut your last turn short, and the user asks you to carry on | Your last step may have finished, half finished, or never started: check what it left (`git status`, `git log`, what its command was to change) before running it again. Then carry on with the work as though nothing had come: no report of the interruption, no questions about it and no stop |

## Reference files

Some of this skill sits in files beside it, each read only when its moment
comes: a directive whose row names it, or one of the moments below. Then read
the whole file before going on, even mid-task, and again in a later session,
which remembers none of it.

- Before `splates add <part> --base task/<your task>`, or handing a subagent
  work that may change code: [references/parts.md](references/parts.md).
- Before `splates handoff`, or when the task gives you a reason to hand it to
  another model: [references/handoff.md](references/handoff.md), handing a
  task to another agent or taking one over.
- Before `splates todo add`, `splates lane add`, or `splates todo update` or
  `splates lane update` with `--lane`, `--position` or `--blocked-by`:
  [references/todos.md](references/todos.md), linking, placing and ordering
  todos.
- Before offering to name a system, or writing `splates.systems.ts`:
  [references/systems.md](references/systems.md).
- When the user asks to set splates up on this machine, or any part of it
  (agents, remote access, notifications, dictation):
  [references/setup.md](references/setup.md), one step at a time.

## Workflow

1. **Start before you look.** When a request may end in a code change,
   `splates add <task> --goal "<what done means>"` before reading any code,
   the Goal one or two lines as you understand it so far, and investigate in
   its worktree: the main tree changes under you as other tasks land, a worktree
   does not. A question that only needs an answer stays in the main tree.
   `splates claim <task>` resumes a task instead. When the request is a todo,
   take it as `[SPLATES TODO #N]` says under Directives, and for any other
   directive, do what its row says. Pass `--base <branch>` only when invoked
   with a branch (`/splates feature/auth`) or the user names one; never guess a base from the
   checked-out branch. Once `splates add` succeeds, the `splates server` page shows
   it in your conversation as splates's own line, the Goal on its task, so say
   nothing about adding it. When your harness asks right after for a word on
   what you are doing, say in one line what you will do next, without the
   task's name or Goal, which that line already shows.
2. **Plan.** Once you know what done means, fill in `SPLATES.md` before
   touching code (see SPLATES.md below), then groom the todos your work touches
   (see Grooming related todos). Keep the task yourself unless it gives you
   a reason another model should take it: work that has failed you, or a
   long, fully planned, mechanical rest (see
   [references/handoff.md](references/handoff.md)).
3. **Check for overlap.** Read `splates list --files`: each task's Goal and
   the files it has changed so far. Some overlap is normal: work alongside,
   accept the rebase, and note it in `SPLATES.md`. Only when conflicts would be hard to resolve, `splates wait
   <task>` for the other task to land first. If it is doing the opposite of
   what you were asked, escalate instead.
4. **Work.** Commit each step with git as you go, and move it to `## Done`
   as you commit it; splates never commits for you. When something outside
   your Goal comes up (a bug next door, a follow-up, a reply that widens the
   task), `splates todo add` it from your worktree and move on,
   so the task stays one coherent change; the conversation shows what you
   added (see Proposing a todo). Write down each call the request
   does not settle as you make it, as an assumption or a question, and keep
   going (see Asking as you go), bringing `## Blocked` up to date before
   each step. Before handing a subagent work that may change code, read
   [references/parts.md](references/parts.md): it works in a part of your
   task. Run a whole test suite, an install, or anything as heavy as
   `splates heavy -- <command>`, unless the project's instructions say its
   script takes a slot itself: it waits for one of the machine's few
   heavy-job slots, so agents testing at once queue rather than run it out
   of memory.
5. **Land.** Once every step under `## Next` and every question under
   `## Blocked` is checked, the task is ready to merge, whatever stands
   under `## Assumptions`: `splates todo add`
   any step you will not do, then check it off. Groom again, release each
   todo you only partly did (see Todos), squash to one commit (see
   Committing), and `splates merge`, or ask for a review first (see Merge or
   review). On failure, do what stderr says and merge again. A successful
   merge deletes your worktree: `cd` to the main tree it prints before
   running anything else.

   An existing Git `index.lock` stops merge as `blocked` without spending an
   attempt. Wait for its owner to finish and merge again; never delete a lock
   held by a live operation. A failed rebase with no unmerged paths is
   `merge_failed`, not a content `conflict`.

   Each `conflict`, `tests_failed` or `merge_failed` spends one of the
   task's merge attempts, so write under `## Notes` what each one failed
   on. When `merge` stops on `budget_exhausted`, escalate (see Escalation)
   and tell the user why merging keeps failing: a `- ` line per attempt on
   what it failed on (the files that conflicted, the check that broke, the
   tree in the way), then one on what would get it through, so they can
   choose between `splates retry` and a remove and redo.

**Clean up every task you start.** A task ends in a merge or a remove, never
left behind, unless you hand it off, when it is the other agent's to end; one escalated and waiting on the user is not done, so leave it
for `splates claim`. When investigating shows there is nothing to change, the
work is moot, or it is better redone against current trunk, `splates todo
remove` each todo it holds that is done or moot, `splates todo update` the rest
with what you learned, then `cd "$(splates path)"` and `splates remove <task>
--reason <why>`, which puts them back on the list. The reason is `nothing`
(nothing to change), `moot`, `superseded` (done some other way) or `redo`
(better redone against current trunk); the Stats page counts them.

`wait` ends on `removed` (landed or dropped: check for overlap again),
`escalated` (the other task needs the user: tell them you are blocked on it),
or a broken status (`wait` once more, then ask). Judge a task by its status,
never its lease: `stale` is normal for one mid-edit.

## Working the untriaged lane

`[SPLATES LANE untriaged]` makes you the orchestrator of the todos in no lane.
You place them in lanes first, then work those lanes as
[references/lanes.md](references/lanes.md) says (read it before step 3, and
for Relaying and the lane reports):

1. `splates lane show untriaged` lists them. For each open one, read `splates
   todo show <id>`, `splates lane list`, and `splates list --files` for the
   tasks under way, then place it as for a todo you add (see Lanes in
   [references/todos.md](references/todos.md)): in a lane whose work it
   builds on, or `--lane new` for one of its own when it starts a chain,
   saying the name you gave it in your report as `- Assumed: <what>`.
   Todos that touch the same files go in one lane, in the order they should
   land, so their agents never fight over rebases.
2. Link what blocks each: `splates todo update <id> --blocked-by <id>` when it
   needs another todo's code or data merged first, in any lane, never for
   priority. When two todos ask for opposite things, or one undoes a task
   under way, leave them untriaged and ask the user which wins, as numbered
   questions in your reply, placing the rest meanwhile.
3. Say in a line where each went, then work down each lane you placed one in
   that no agent is on, as if sent `[SPLATES LANE N]` for it. Leave a lane
   another agent is on to that agent.
4. Each time you go back to step 1 of a lane, `splates lane show untriaged`
   again, and place any todo added since the same way. Once nothing is left
   to place and every lane you work is done, end on a finished report.

## Todos

Write a todo's subject the way you write a question's, short enough to scan.
Put the why, the where, and anything else in its detail, as markdown the
`splates server` page renders: paragraphs, lists, `- [ ]` steps, inline code for
paths and commands, and fenced blocks for snippets. Single quotes keep the
shell off the backticks. Before every `splates todo add`, read
[references/todos.md](references/todos.md) on linking it to what blocks it,
placing it in a lane, and where in the list it goes:

```sh
splates todo add "Upload retries forever on a 413" 'The client retries on any 4xx in `src/upload.ts`.

- [ ] stop retrying on 413
- [ ] tell the user the file is too big' --agent claude --model sonnet
```

Every todo you add names the model to run it with, `--agent <id> --model
<m>`, since you know what it takes better than whoever starts it later. Read
`splates agents` once per task for what each model is good at and what it
costs, and pick the cheapest one the todo is worth: a cheap one for a
mechanical change, a strong one for a design call or a long, tangled change.
Keep the agent you run as unless another fits clearly better. When grooming
changes what a todo takes, `splates todo update <id> --agent <id> --model <m>`
picks again.

When you take a todo that names a model other than the one you run as, take
it anyway: whoever handed it to you chose you. Say so in a line of its own
right after `splates add`, such as `#12 names Sonnet; I run as Opus.`, so the
user can stop you and start the model it names instead.

Name the files and the feature in the detail, the feature by its system name
when one covers it (see Systems), so whoever grooms the list later can tell
the todo is about their area.

`splates todo update <id> '<detail>'` replaces the whole detail, so pass all of
it: what still holds and what you learned. Merging removes every todo the task
holds: update one you only partly did with what is left, then
`splates todo release` it, so it stays on the list.

When `splates add --todo` or `splates todo take` warns that a todo is blocked,
what blocks it has yet to merge: `splates todo wait <id>` for it, or, when the
user asked for this todo now, do only what does not need the blocker and say
so in your report.

### Grooming related todos

Todos about the same area as yours: your change can settle them, shrink
them, move what they point at, or make them wrong, and you hold the context
that makes each one cheap right now. Groom them once you have planned, and
again just before merging:

1. **Find the related todos**: read `splates todo list`, leaving off `--open`,
   since a todo another task has taken can still be affected by yours. Those
   in your todos' lanes, those blocking or blocked by them, and those whose
   subject names your files or feature are related. `splates todo show` each
   one your work might touch.
2. **Act on each one**, in this order of preference:
   - **Claim it** when it is open and your change settles it, makes it moot,
     or would with a little more work in the same files: `splates todo take
     <id>` and add it to your Goal. Claim every one you can, since the next
     agent would have to rebuild the context you have now, as long as the
     task stays one coherent change: that is grooming, not growth.
   - **Update it** when your change alters it without settling it (a path
     moved, a step is done, the approach no longer fits), ticking off the
     `- [ ]` steps you did.
   - **Place it** when it is untriaged and belongs in a lane (see
     [references/todos.md](references/todos.md)).
   - **Coordinate** when another task has taken it and your change affects
     it: never take it, read its Goal in `splates list --files`, and note it
     in `SPLATES.md`.

### The next todo

Whenever a task ends, merged or removed, propose the next todo, so the
context this conversation built up gets used before it is gone: from
`splates todo list --open`, the one most related to the work just done (the
same files, feature, or problem; `splates todo show` one to be sure), preferring
one that came up in the task; among equally related ones, or when none is related, the top of the list.
`merge` prints its pick by that order; `remove` prints none. After a merge,
also propose the next one or two when they are as related, so the user can
choose.

A task whose todos were in a lane is the exception: propose that lane's next
todo, even one another lane still blocks, so the lane goes on in order. `merge` prints it; after a `remove`, read it from
`splates lane show <n>`. When the todos were in more than one lane, propose each
lane's next todo and let the user choose. Only when the lane is done, fall
back to the most related todo.

### Proposing a todo

Whenever you propose a todo to the user, head it one level below the report's title with 📝, its subject
exactly as `splates todo show` prints it, and its id, then write one sentence on
why it matters now, such as what it shares with the work just done. The page
shows the todo itself.

```markdown
### 📝 Upload retries forever on a 413 [#12]

It touches the retry loop this task just rewrote.
```

A todo you add needs no heading in your reply: the `splates server` page shows
each `splates todo add` in the conversation as a line naming the todo, which
opens it. Say more about it only what that line cannot, in your own words.
That shrinks what you say, never the todo: its subject and detail stay as
full as Todos asks, since whoever picks it up reads nothing else.

The 📝 belongs to the heading: leave it out of `splates todo add` and
`--subject`.

## Systems

A repo can name parts of its code as systems in `splates.systems.ts`, each a
name keying a short description, its aliases, its globs, and globs to
`ignore`. `splates systems`
prints them, `splates systems <name>` one by its name or an alias, and
`splates systems --task <task>` those a task's changed files fall in. Read them
when you need them, never up front. Wherever a system covers what you mean,
call it by its name in Goals, todos, questions and reports, so the user and
every agent use one word for one part of the code. A prompt from the
`splates server` page that mentions `#name` ends with a line on what that system
is made of, or, when no system answers to it, a line saying so.

A `#name` can name another splates project on this machine instead, and its
line then gives that project's directory and how far it lets you go there
(see Other projects).

Systems are named a few at a time as they come up, never all at once, and
only the user names one. Offer to as a question under `## Blocked`, and write
`splates.systems.ts` only once they pick a choice that does:

- when the user keeps calling one part of the code by a phrase no system has;
- when your task touches files no system covers, at most once per task;
- when a phrase the user uses means a system that already has another name:
  offer the phrase as an alias;
- when the user writes `#name` and no system answers to it: find the code
  they mean, then, if no system covers it, offer to name it, recommending the
  name that code already goes by (its directory, module or main type) over
  theirs; if one does, offer `#name` as its alias.

Before writing that question, read
[references/systems.md](references/systems.md) on how to word it, each name
as `#name` so it reads as a splates system rather than a class, and how to
write the file once the answer comes.

## Other projects

The other splates projects on this machine are yours to read: their code in
their directories, and their tasks, todos, lanes and systems with `splates
--project <slug> <command>` (`splates list`, `todo list`, `show`, `systems`
and the like). `splates projects` lists them, with what each lets this one do
and what this one lets each do. What you may do in one is what it grants
this project:

- **read**: look only.
- **todos**, every project's unless it grants otherwise: `splates --project
  <slug> todo add` what it should do, written as any todo is (see Todos),
  saying in its detail why your project needs it. Leave `--lane` off:
  whoever orchestrates that project places it.
- **tasks**: hand it a task, `splates --project <slug> add <task> --goal
  "<...>" --agent <id> --model <m>`, and orchestrate it as
  [references/lanes.md](references/lanes.md) says for a task you handed
  out. Its directives name it `<slug>/<task>`; run each command on it with
  `--project <slug>`: `show`, `tell`, `wait`, `remove`.

You never take a task in another project yourself: you do not `add` one
without `--agent`, `claim`, merge or escalate one there, and an agent you
hand one to starts none of its own. A command that needs more than the
project granted stops on `not_granted`; never `cd` there to get around it,
which is checked the same way.

Whenever work here needs another project, ask for what it takes rather
than work around it: a grant, as a question under `## Blocked` naming the
project, the reach, and what you would do with it; or, for a repository
that is not a splates project yet, leave to `splates init` it, which makes it
one any agent can reach. Run `splates projects grant <slug> <reach>` from that
project's directory, or `splates init` there, only once the user says so in
so many words, as in "let webappwiz hand out tasks here".

## Creds

When your work needs a secret only the user can get, such as an API token,
request it rather than asking in chat or reading an environment variable,
naming it as its environment variable would be. Say in `--purpose`, in a
sentence, why your work needs it and what it will be used for, so the user
knows what they are handing over before they go to get it; then give
instructions for getting it in markdown: where to go, what to pick, what to
paste.

```sh
splates creds request CLOUDFLARE_TUNNEL_TOKEN --device --purpose 'To add the DNS record that routes `dev.example.com` to the tunnel, through the Cloudflare API.' --instructions '1. Open [API Tokens](https://dash.cloudflare.com/profile/api-tokens), then **Create Token**.
2. Add Zone · DNS · Edit, and pick your zone.
3. Create it and paste it here.'
```

`--device` keeps it for every project on this machine, for the user's own
account; leave it off for a cred of this project's alone. When the store
already keeps it, `request` asks nothing; `--replace` asks again when the
kept one does not work. The `splates server` page shows a "Requested" line in
the conversation that opens the cred on its Creds page, with what it is for,
your instructions and a field to paste it in; say nothing more of the
request. The page's Creds item gets a yellow dot while any request is open, and its
Creds page lists them too, with every cred kept, so a user outside the
conversation finds it there. `splates creds wait <NAME>` until the user saves
it, again on `timeout`, doing meanwhile what does not need it; it ends on
`dismissed` when they turn it down, so carry on without it or ask why.

You never see the value: it goes into the system's store (the macOS
Keychain, Windows Credential Manager, a Linux secret service), and code
reads it in-process through `webappwiz/creds`, never through the
environment, argv or a file. `splates creds list` names what is requested and
kept.

## Remote access

When the user asks to reach `splates server` from elsewhere, that is the Remote
access setup area, from its `cloudflare-token` step through `tunnel`, `access`
and `slot-tunnels`: walk them through it as
[references/setup.md](references/setup.md) says. Its `splates tunnel setup
<host> --email <theirs>` makes the Cloudflare tunnel, its DNS record and its
Access application with an API token kept as the cred
`SPLATES_CLOUDFLARE_API_TOKEN`, and saves them for the machine, so a bare `splates
server` comes up tunneled. Without the token it requests it, with how to make
it, and exits `requested`: say so and wait as for any cred (see Creds), then
run it again. When the account has no Zero Trust organization, it asks for
`--team <name>` to make one. Ask the user for the host, the emails and any
team name rather than guessing them. By hand, or for a tunnel other than
cloudflared, it is `splates server --tunnel <host> --access-team <team>
--access-aud <aud>`: it runs `cloudflared tunnel run` against the page and
allows that host, and it refuses to start without both Access flags, since
who may enter is wholly the Cloudflare Access policy's call (`--tunnel-name`
picks a named tunnel). Never run a tunnel by hand with `--allow-hosts` and no
Access: that host then reaches only the todos.

A tunnel of their own is a `tunnel` in the repo's `splates.config.ts`, an object
implementing `TunnelProvider` from `@stringsync/splates/tunnel-provider`:
`ready()` throws, saying what to do, unless the tunnel can run, and
`run({ host, url, log })` carries `host` to `url` and returns a resource
whose `disposeAsync()` stops it. Type the config with `satisfies ConfigFile`.
`--tunnel` runs it in place of cloudflared and still needs the Access flags;
`--tunnel-name` is refused beside it. Write one only when asked, as a
separate task from whatever else is under way, and read
splates's `tunnel-provider.ts` first. A provider that is not ready is
logged and skipped, so check the `splates server` log, not the page, to see
whether it came up.

## Asking as you go

Do not save questions for escalation. Whenever you make a decision that does
not clearly follow from what the user asked (a name, a default, behavior they
never mentioned, one reading of an ambiguous ask), write it down in
`SPLATES.md` right away, saying what you chose and what else you could have
done, and carry on. Which kind it is depends on how hard the call is to
undo and what a wrong guess would cost, not on how sure you are:

- **An assumption**, under `## Assumptions`, when reverting or editing one
  commit would undo the call, in this repo's code alone, touching no data,
  users or outside systems. A close call is one too: take the better pick and
  write the runner-up as its other choice. Nothing waits on it: `splates merge`
  and `splates escalate --review` pass over it, and the user challenges it only
  if they disagree.
- **A question**, under `## Blocked`, when undoing the call takes more than
  that (a migration, data written, a message sent, anything outside the
  repo), when a wrong guess would cost much rework even though it can be
  undone (a data shape many files will build on), or when it goes against
  something the user said before. The task cannot merge until it is
  answered, though the user can answer in chat while you work.

Size each call by how far it reaches, never by how long it takes, and lead
its line with the size in parentheses, after its number:

- **small**: stays local and is cheap to redo: a name, a default, wording,
  one component.
- **medium**: shapes how a feature behaves or looks, or spans systems.
- **large**: hard to undo or outward-facing: a data format, an API, a
  migration, the architecture, what other projects or people see. A large
  call is always a question, never an assumption.

The Stats page counts, at each size, the calls the user made against those
agents made without them, so size every call, the ones a proposal asks
included, wherever you write it.

Build so calls stay cheap to undo, since that is what lets them go ahead as
assumptions. Keep each choice in one place (a constant, a config value, a
single component or module), and keep what uses it loosely coupled to it:
callers go through a narrow surface (a function, a type, a module's exports)
and never reach into how it works, so swapping in another implementation
changes that one place and none of its callers. Before asking a question
because a wrong guess would cost much rework, look for such a seam: when one
would contain the call, build it and assume instead. A seam is a boundary,
not ceremony: no interface or abstract base for a single implementation, and
no layer added only in case. When an answer or a challenge overturns a
choice, redo that part.

Say each assumption in the conversation too, in the reply that ends the turn
you wrote it in, so the user sees the call while it is cheap to undo: a
`- Assumed <number>: <what you chose>` line each, its number the one it has
in `SPLATES.md`, beyond any cap on `- ` lines, after the others and before any
todo, demo or question, those an exhibit shows under it (see below). The `splates server` page shows each as that item, with
its choices, for the user to challenge from the reply. A review leaves
them out, since its Ready to merge card lists them, and a proposal lists them
as Proposing says.

An answer can reach you mid-turn, as a message that arrives while you work.
Read it at the next step rather than at the end: record it (see Keeping
Blocked current), and redo at once what it overturns, before building more on
the choice. While a question is open, do the work it touches last where your
plan allows, so an answer that overturns it costs little.

Number assumptions and questions in one sequence, 1, 2, … in the order you
write them; numbers never change, and new ones continue from the highest in
either section. An assumption is written the way a question is, its
`(chosen)` choice the one you took. A question's line is its subject, short
enough to scan and ending at its `?`, with nothing after it; everything else,
the why included, goes in markdown lines indented under it, code blocks
included. When checking your own work, ask for what is wrong rather than
a bare yes or no. A yes or no decision is one of a few: give it `- (a) ...`
choices, each saying what happens, never a bare "Yes" or "No", so the answer
cannot be read two ways. When the answer is one of a few, end with
`- (a) ...` lines (pick one, or none), or `- [a] ...` lines for all that
apply. Describe every choice, the one you went with too, and mark that one
`(chosen)`: never a bare "That". List it first, as `(a)`: the `splates server`
page puts it first and picks it for the user, who answers by changing it. When the answer is an order (what lands first, which todo
matters most), end with `- a. ...` lines in the order you would go with: the
reply lists every letter in the order picked, `4. b, a, c`.

When the pick is a close call, or the user may well want to challenge it,
give a choice a `Why:` line indented under it: one sentence on why you would
take it, or why not. Any choice can have one, the `(chosen)` one most often;
leave it off where the choice says it all. The `splates server` page hides every
`Why:` line until the user asks to see a question's reasons, so they never
crowd the choices.

```markdown
## Blocked

- [x] 1. (large) Should the old upload endpoint stay for a release? → a
  - (a) Keep it for one release, logging each call (chosen)
  - (b) Remove it now
- [ ] 2. (small) What looks wrong in the header at 390px?
  ![header at 390px](/abs/path/shot.png)
- [ ] 3. (large) How should existing sessions move to the new tokens?
  Sessions are keyed by the old cookie.
  - (a) Migrate each session on its next request (chosen)
    Why: no one is signed out, and the old cookie still reads for a release.
  - (b) Sign everyone out once
- [ ] 4. (medium) In what order should the settings pages land?
  - a. Profile
  - b. Billing
  - c. Notifications
```

```markdown
## Assumptions

- [ ] 5. (small) What should the retry limit be?
  Kept in `MAX_RETRIES` in `src/upload.ts`.
  - (a) Three tries, a second apart (chosen)
  - (b) Five tries, backing off
```

Show what a question is about whenever it is something to see: a screenshot,
or a short recording when it moves or takes steps. Save it outside the
worktree, `splates attach` it, and name the path it prints as
`![what](/abs/path.png)`. The `splates server` page shows an attached file inline,
in `SPLATES.md` and in your replies alike, playing a `.mp4`, `.webm` or `.mov`
as a video. Only attached files show there, so never point a question at a
file anywhere else. Attached from a conversation (`splates server` gives its agents
one; an agent outside it passes `--conversation <id>`), a file stays with it
past the task, so the question still shows it when the user scrolls back;
attached outside one, it goes when the task does. Such a file is no artifact
(see Artifacts): it serves the question it is in.

Put each screenshot in the question it is for, under what it shows: under the
question's line for what it asks about, or indented under a choice for what
that choice looks like, which the `splates server` page shows with the choice.
Never gather them above the questions, or ask about them apart from the
question they are for.

```markdown
- [ ] 6. Which style should the action list take?
  - (a) A rail beside the thread (chosen)
    ![rail](/abs/path/rail.png)
  - (b) A bordered panel
    ![panel](/abs/path/panel.png)
```

An assumption the user can see goes unread as a line of words, so show it:
whenever a call is about something visible (a layout, a wording on screen)
or a shape (a data flow, a state machine, a type), put an exhibit in its
body, under its line: a screenshot or recording, a diagram as an attached
image (the page draws no diagram source), or a short code block or diff.
Words alone are no exhibit; they stay its body. Leave a call with nothing to
show (a name, a limit) a line. An exhibit captions one or two calls, never
more: two shown by the same screenshot or snippet each carry it, line for
line, and the `splates server` page shows it once, open, with them under it, among
the rest by number.

```markdown
## Assumptions

- [ ] 7. When should the nav collapse into a menu?
  ![header at 390px](/abs/path/header.png)
  - (a) Below 480px (chosen)
  - (b) Below 640px
- [ ] 8. Where should the search box go once it collapses?
  ![header at 390px](/abs/path/header.png)
  - (a) Into the menu (chosen)
  - (b) Beside the menu button
```

In a reply, put an exhibit among the `- Assumed` lines as a
`### 🖼️ <what it shows>` heading, the exhibit, then, with no blank line
between them, the `- Assumed` lines it captions:

```markdown
- Assumed 9: Named the breakpoint `NAV_COLLAPSE`

### 🖼️ The header at 390px

![header at 390px](/abs/path/header.png)

- Assumed 7: The nav collapses into a menu below 480px
- Assumed 8: The search box moves into the menu
```

## Keeping Blocked current

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
- move each assumption the user challenges to the end of `## Blocked`,
  keeping its number, and treat it as a question from then on: write what
  the challenge says after `→`, starting it with `challenged:` so the Stats
  page can count it, and check it off once you have acted on it;
- add each question you now need.

The user answers in chat. From the `splates server` page, a reply quotes each
question it answers, its line in bold (`> **How should …?**`), and answers
under it: the choices picked as `- (b) <its text>`, numbered in the order
picked for an order, then any words. Anything else they say comes before the
first quote. Match each quote to an open question by its line, whatever its
number; questions not quoted stay open. A quote can come from `SPLATES.md` as
the page last read it, ahead of your report: when it matches no question you
have open, as one you changed since, ask again rather than guess what it
answers. Typed by hand, a reply is a list matching your latest report: `2.`
is its second question, whatever its number in `SPLATES.md`, and items left out
stay open. When a reply does not fit your latest report, ask rather than
guess. Whenever anything the user says settles an open question, even
without naming it, write that answer after `→` and check it off, so it is not
asked again. Check an item off only when its answer is one you can act on;
anything else stays open and leads your next report. A reply about something
you did is an instruction. When the user defers or skips a question, check it
off and carry on without it (for a defer, `splates todo add` it first). Only
the user answers questions, yours or another agent's, but for the answers
of an agent that handed its task on with `--relay` (see
[references/handoff.md](references/handoff.md)).

A message `splates tell` says in your conversation for the lane's
orchestrator that handed you your task, to carry on or to change course,
you take as you would the user's.

A challenge comes the same way, naming an assumption by its number or its
line, and you act on it at your next step, as you would an answer.

When the user asks to see the work before it lands, write `Review:
requested` under `## Notes` at once, so the request outlives your session.

## Escalation

Escalate when questions are still open once everything else is done, or when
you cannot go on without the user (access, a decision, a test only they can
run). A secret, such as an API token, is a cred to request instead (see
Creds).

1. Leave something to look at, by **absolute path** (start from
   `splates path <task>`): for anything visual, a screenshot or recording you
   `splates attach`. Ask first if producing it is expensive.
2. Write each question not already there under `## Blocked`.
3. `splates escalate <reason>`.
4. Report, end your turn, and wait for the user to answer in chat. Do not run
   `splates wait` or poll `SPLATES.md`: answers only come in chat. Then
   `splates claim <task>` to carry on. `splates retry`, for `budget_exhausted`, is
   the user's to run, before you claim.

Never ask whether the work is ready to merge among other questions, or as a
question at all: once they are answered and the work is done, merge or ask
for a review (see Merge or review).

### Answering to the agent that handed you the task

When an agent handed its task on to you with `splates handoff --relay`
(`$SPLATES_CALLER` is set), you report to it, not to the user, who cannot
write in your conversation: every message after your first comes through
it, answers and `[SPLATES MERGE]` included. Work as above, but write for it,
since it reads your `SPLATES.md`, not your replies:

- every question under `## Blocked`, as always, before you escalate;
- for a review, the review report itself, its sentence, demo and `Checks:`
  line, under `## Notes` as a `### Review` of its own, before `splates
  escalate --review`;
- an answer it gives itself, saying so, moves its question to the end of
  `## Assumptions`, numbered as it was, its `(chosen)` the answer.

`splates escalate`, `splates merge` and `splates remove` tell it you stopped.

A lane's orchestrator that handed you a todo (`$SPLATES_STARTED_BY` is set)
is not one you report to: you answer to the user, as for any task, and
splates tells it where the lane stands from the todos. Propose no next todo
once you merge or remove: it hands that out.

## Merge or review

A task ready to merge has every step under `## Next` and every question under
`## Blocked` checked; `splates merge` and `splates escalate --review` both refuse
one that is not. Whether the user looks first is yours to decide:

- **Merge** work you verified yourself. This is the default, and the usual
  end of a small change.
- **Ask for a review** when verification needs the user (external services,
  destructive migrations, visual changes), when `## Notes` says `Review:
  requested`, or, absent instructions, when the change is complex enough
  that correctness needs a reader rather than a test. Leave something to
  look at (step 1 of Escalation), `splates escalate --review "<what to look
  at>"`, report it (see Reporting), and end your turn.

When the user has to see a change to judge it, make that cheap: run it for
them where they can open it (a dev server on throwaway data that shows each
case, never their own), and give them a demo (see Demos). Run splates in a
throwaway repository with `SPLATES_HOME` set to a throwaway directory, so it
stays out of the user's `splates server` project list. Start the server from your
worktree, then `splates ports <task>` prints each port it listens on with two
links: its remote one, `https://<task>-<port>.<base>` behind the user's
Access, when `splates server --ports-host` saved a base, and its local one on the
machine `splates server` runs on. Give the user both, the remote one first, in
the demo's line on where to open it; the task's dialog on the page lists
them too. When `splates tunnel status`
shows a tunnel, `splates server --slot` from your worktree does both and prints a
`https://<word>.<zone>` the user can open on their phone too: give them that.
Your worktree keeps its slot until the task merges or is removed, which stops
its server. Every other slot is another task's: never kill its server or edit
`~/.splates/slots.json`, even when it looks left behind. When none is free, run
`splates slots prune`, which frees only those no task holds any more, and
otherwise ask the user.

## Proposing

When the user asks what you think, or a request leaves open a design that
would be costly to build on a wrong guess, propose before you build, so the
user can approve it or challenge what it rests on. A change one commit's
revert would undo needs no proposal: make it, writing its calls as
assumptions.

A proposal is one block: a `## 💡 Proposed <subject>` title, the subject a
few words on what you would build, lowercase after its first word; a blank
line; one plain sentence, under 25 words, on what you recommend; then a
`####` section for each reason the user needs, its line stating one point in
a sentence, then three `- ` lines, one fact each, with no paragraphs. It
ends with each call it rests on that the user has not settled, as a list of
questions numbered from 1: a call you have a clear pick for marks that
choice `(chosen)`, as an assumption does, and one you have none for marks
none, as a question.

```markdown
## 💡 Proposed a card for proposals

Fold proposals into the questions card, each assumption a question already answered.

#### An assumption is a question with an answer.

- The questions card already tags a `(chosen)` choice.
- It already heads its questions with an escalation's report.
- One card then asks everything, answered or not.

1. (medium) Where should a proposal's assumptions come from?
   - (a) The reply, so a proposal works outside a task too (chosen)
   - (b) `SPLATES.md`, so every proposal needs a task
2. (small) What should its button say?
```

In a task, write each call in `SPLATES.md` too, the chosen ones under
`## Assumptions` and the rest under `## Blocked`, then `splates escalate` as
Escalation says and end your turn, so the task shows as waiting on the user;
the page draws the proposal as the escalation's card, so ask nothing else.

The `splates server` page shows a proposal as a questions card headed by it, each
call with a `(chosen)` choice already answered with it. Once every call is
answered and the user has changed none of your choices, its button approves,
sending `[SPLATES APPROVE]`, then the answer to each call you chose nothing
for, quoted as any answer is (see Keeping Blocked current). That, or a reply
of "approve", means go ahead as proposed, taking in each answer, every call
not quoted as you chose it, after `splates add` when no task is under way. A
reply without it, as the card sends once the user picks another choice,
challenges a call or writes anything else, answers what it quotes: take that
in and propose again.

## Demos

Whenever the user is to try something (a review, a question on how something
looks or feels, a test only they can run), show it as a demo rather than
describing it: a `### 🎬 Demo: <what it shows>` heading, a line on where to
open it, then the steps, numbered from 1. Each step's line is one thing to
do; indented under it, one line on what they should see, and a screenshot or
recording when it helps. The `splates server` page shows a demo as a checklist
they tick off as they go.

```markdown
### 🎬 Demo: dragging a card on a phone

Open http://localhost:4310 at 390px wide (a demo repo, nothing of yours).

1. Press and hold a card.
   It lifts after half a second.
2. Drag it to another lane.
   It lands where you drop it.
   ![dropped in Doing](/abs/path/drop.png)
```

Give one demo per message, right before the questions it is for, or inside a
review before its last line. The steps are the demo's only numbered list:
never number steps elsewhere in a report, where they would read as questions.

When the user approves, by replying "merge" or with `[SPLATES MERGE]`,
`splates claim <task>` and merge. When that merge
stops on a conflict, name each file you resolved in the merge report, since
that code changed after the user looked. When they ask for
changes, `splates claim <task>`, add each as a step under `## Next`, and work
through them as before.

While a review waits on the user, every reply that ends your turn ends with
the whole review report again, brought up to date, never its last line
alone: after you answer a question about it, after the changes they asked
for, or after anything else they say in between. The `splates server` page shows
the Ready to merge card, which the user merges from, only for a whole report.

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

Archiving a conversation deletes the bytes of its removed artifacts and
earlier versions, keeping what its panel shows; each leaves a placeholder
saying why it went.

One file may be 50 MB, one conversation's artifacts 250 MB, and the project's
2 GB, counting every version whose bytes are kept and, toward the last two,
the files attached from conversations (`artifactFileCapacity`,
`artifactConversationCapacity` and `artifactProjectCapacity` in
`splates.config.ts`). Past the project's, `splates server` evicts the oldest bytes
first: removed and earlier versions of any conversation, then what archived
conversations show, then what live ones do. Past the file's or the
conversation's, or the project's when even eviction would not make room,
`add` stops on `too_large`, keeping nothing of that file: trim a recording
rather than ask for more room.

Most files you show are not artifacts: a screenshot that shows a question or
an assumption, an exhibit in a reply or a report's card, a demo step's image.
Each serves the moment it is shown in, so it stays inline: `splates attach` it
and name it as `![what](/abs/path.png)`, as Asking as you go and Demos say.
Make a file an artifact only when the user would look for it on its own,
apart from the reply it came in.

## Reporting

The user reads a report at a glance, so it holds only what they need to act
on. However a task ends, say so in one block: a `##` title, a blank line, and
one plain sentence, under 25 words, on what changed for the user. The title is
the emoji, the outcome, and the bare task name, then the base for a merge, or
otherwise, after a colon, what it waits on or why it went, led by what it
needs from the user (a review, a decision, access, a test only they can run).
Keep the title to about eight words, lowercase after the colon, with no ending
punctuation.

The sentence names the one change the user will notice, not each part of it:
status codes, errors thrown and the rest are the diff's. Then stop, but for
a `- ` line, at most three, on anything the user must act on or would be
caught out without: a restart to pick the change up, a file resolved in a
conflict after their review, a todo gone stale. Leave out what the page, the
diff, or `SPLATES.md` already says: that tests pass (but for a review's
checks), that nothing is merged yet, the files touched, how you did it, and
calls you made, the questions asked as questions and the assumptions said as
in Asking as you go.

Count the sentence's words before you send it, and at 25 or more, cut it
rather than split it in two. Not this body, which lists the parts, says the
tests pass, and says it is not merged:

```markdown
Uploads no longer retry forever on a 413. They now tell the user the file is too big and fail; `bun test` passes. It is not merged yet: it waits on your answer below.
```

But this, one sentence at 15 words:

```markdown
An upload the server refuses as too big now stops and tells the user why.
```

When the user has answered questions since your last report, add a `- `
line for each answer you did not follow as given, or that changed more than
it named, saying what you did instead and why. Answers followed as given need
no line.

```markdown
## ✅ Merged <task> onto <base>

One sentence on what changed.

- Restart `splates server` to see it.

### 📝 <subject> [#<id>]

Why it is a good next step.
```

```markdown
## 🛑 Removed <task>: superseded by a fix on main

One sentence on what the task set out to do.

### 📝 <subject> [#<id>]

Why it is a good next step.
```

When the task made an artifact, a merge report names it in a `- ` line,
`- Artifact: <name>`, rather than inlining it: the page lists it already, and
the report stays a glance.

A merge or remove report ends with the proposed todos, the best one first,
each kept to its one sentence; leave them out only when no todo is open.

A handoff makes no report: the `splates server` page shows it as splates's own line,
and the agent it went to as that line's hover. Say where the task stands in
its `### Handoff`, then end your turn.

A lane orchestrator reports on its lanes instead, as
[references/lanes.md](references/lanes.md) says.

An escalation or a review can need more than that before the user can
answer or merge: what you found, how it works, what it costs. Say it in
sections, so every card reads the same: a `####` line stating one point in a
sentence, then `- ` lines with its details, one fact each, and no paragraphs.
Give a section only to a point the user needs; most reports need none. Keep
to `####`: a `##` or `###` heading would end the card.

```markdown
## ⚠️ Escalated <task>: needs two calls on the todo board

One sentence on what changed.

#### A card drags on a phone only after a long press.

- A short press still scrolls the lane.
- The long press is half a second, as on the home screen.

### 🎬 Demo: dragging a card on a phone

Open http://localhost:4310 at 390px wide (a demo repo, nothing of yours).

1. Press and hold a card, then drag it to another lane.
   It lands where you drop it.

1. What feels off when dragging a card on a phone?
2. How should a stale todo be shown?
   - (a) A muted card
     ![muted card](/abs/path/muted.png)
   - (b) A "stale" badge
     ![stale badge](/abs/path/badge.png)
```

An escalation ends with every open question, those left open from earlier
reports first, as a list numbered from 1 whatever their numbers in
`SPLATES.md`, after the demo they ask about, if any. Ask every question you need
answered there, never in prose. The user answers from the report, so each
item carries what is needed to answer it: its subject, at most one line of
body under it, the choices exactly as in `SPLATES.md` (so a reply of `2. b`
names one), each with its `Why:` line, which the page hides and the one line
of body leaves out, and each screenshot or file by absolute path, under the question
or choice it shows as in `SPLATES.md`. Inline a screenshot as
`![what](/abs/path.png)` when the `splates server` page or your harness shows
images in chat; otherwise link it as `[what](/abs/path.png)`. Leave an item
bare when its subject says it all.

```markdown
## 🔍 Ready to merge <task> onto <base>

One sentence on what changed.

### 🎬 Demo: moving todos between lanes

Open http://localhost:4310 (a demo repo, nothing of yours).

1. Drag a todo to another lane.
   It lands where you drop it.
2. Reload.
   It stays there.
   ![the board after a drag](/abs/path/board.png)

Checks: `bun run typecheck`, `bun test`

#### A drop saves the todo's lane and position in one write.

- A reload never shows it half moved.
- A drop on its own spot writes nothing.

Reply "merge", or say what to change.
```

A review asks no numbered question: after its sentence comes the demo of
what to check, then a `Checks:` line naming each check you ran that passed,
as the project's instructions name them, each in backticks, and under it,
when one failed for a reason outside the task, a `Failed:` line naming each
that failed the same way, then that last line exactly, so every review reads the same. Anything more the user may
want before merging, such as how it works, goes in sections between the
checks and the last line: the `splates server` page folds it away as its details,
below the assumptions it lists from `SPLATES.md` and the checks.

Number questions the same way wherever you ask them: a mid-task reply, a
merge report, or a message outside any task. The user answers by number, so
two or more questions always go in a list numbered from 1, never a bulleted
one, never several in one item, and never one tucked into a sentence. Each
item's line ends at its `?`, as under `## Blocked`, so the page can show it
as a question.

## SPLATES.md

Your session can die at any moment; `SPLATES.md` is what lets a stranger
`splates claim` the task and continue. Size it to the task: a few lines for a
small change, a full record for a long one.

````markdown
# <task>

## Goal

One or two lines on what done means.

## Done

- [x] finished steps: the only progress the task reports

## Next

- [ ] every step you can foresee, roughly one commit each

## Notes

Decisions, dead ends, and how to verify.

## Assumptions

- [ ] calls you made without asking, numbered with `## Blocked`

## Blocked

- [ ] questions the user must answer before the task merges
````

The Goal's first line is what other agents see of your task in `splates list
--files`, so make it say what you are changing. Keep the rest current as you
go, not at the end: move steps to `## Done` as they land. Run `splates show <task>` after writing it to check
the shape. It is excluded from git: never mention it in a commit message.

## Committing

Plain, human-style messages with **no attribution**: no `Co-authored-by:`,
no "Generated with", no agent or model names, no `--author`. Wanting many
more than 5 commits means the task wants splitting.

Before `splates merge`, squash to one commit describing the net change, what
the base gains, not the path you took:

```sh
git reset --soft "$(git merge-base <base> HEAD)" && git commit -m "<message>"
```

End the message with the assumptions that went unchallenged, one `- ` line
each saying what you chose, under an `Assumed:` line, so the history records
the calls nobody looked at.

`<base>` is what `splates show <task>` prints: trunk unless the task was created
with `--base`.
