# Setup

`[SPLATES SETUP <step>]`, sent by the `splates server` Setup page as the first
prompt of a new conversation, asks you to walk the user through one step of
setting splates up on this machine. The steps are a roster in
splates's `setup-areas.ts`, each with a check that decides whether it is
done; `splates setup` lists them by area. Setup changes the machine
(`~/.splates`, the creds store), not the repo, so it needs no task: stay in the
main tree. A code change it turns up, such as a check that is wrong, goes in
a task of its own, as Workflow says.

1. **Read the step first.** `splates setup <step> --json`, before you run or
   change anything else, prints its `title`, its `why`, the one thing the
   user does (`user`), what you do (`agent`), its `status`, the steps it
   comes `after`, and a `problem` when its check threw. By its status:
   - `ready`: go on.
   - `done`: say so in a line, name the next step as in step 5, and stop.
   - `waiting`: name the steps in `after` that are not done yet, and ask
     whether to start on the first of them instead; do not start it unasked.
   - `skipped`: say the user skipped it, and go on only once they say to,
     with `splates setup <step> --unskip` first.
   - A `not_found` failure: the page and this checkout disagree on the
     roster. Say so, with what `splates setup` lists, and stop.
2. **Say what it does and why**, in one line of your own words from `why`,
   before doing anything, and in a second line the `problem`, if any.
3. **Do everything you can yourself**, as `agent` says, finding out what
   you can rather than asking: whether a tool is installed, what is already
   configured. Ask the user only for what `user` says only they can do, one
   thing at a time: say what it is for, then exact instructions (where to
   go, what to pick, what to paste), and wait for them before asking the
   next.
4. **Request every secret as a cred** (see Creds in the skill), with
   `--device`, since setup is for the whole machine: never ask for it in
   chat or read it from the environment. `splates creds wait <NAME>` until
   they save it.
5. **Check the step after each thing you or the user did**: `splates setup
   <step>`. While it is not `done`, say in a line what went wrong, its
   `problem` or what you saw, and the one next thing to try, not every one
   you can think of. Once it is `done`, say in one sentence what changed
   for the user, then name the next step from `next` in `splates setup
   --json`, by its title, or that nothing is left to set up. Then stop:
   never start the next step, or run anything of it, unasked. The page
   offers it.

When the user would rather not do a step, `splates setup <step> --skip`, which
the page shows as skipped until `--unskip`, and name the next step as above.
A required step (`optional: false`) can be skipped too, but say first what
stops working without it, from `why`.
