# Other projects

The other splates projects on this machine are yours to read: their code in
their directories, and their tasks and lanes with `splates
--project <slug> <command>` (`splates list`, `task list`, `show`
and the like). `splates projects` lists them, with what each lets this one do
and what this one lets each do. What you may do in one is what it grants
this project:

- **read**: look only.
- **queue**, every project's unless it grants otherwise: `splates --project
  <slug> task defer` what it should do, written as any task is (see Queueing tasks in [queue.md](queue.md)),
  saying in its detail why your project needs it. Leave `--lane` off:
  that project's user places it.
- **tasks**: also run its queue: `splates --project <slug>` with `task
  update`, `task remove`, `lane` and `queue`.

Name another project's task with its slug before the number, as
`webappwiz #404`: the page links it to that project's board, where a bare
`#404` is this project's.

You never start or take a task in another project yourself: you do not
`add`, `claim`, merge or remove one there. Queue it, and that project's
queue starts it. A command that needs more than the project granted stops
on `not_granted`; never `cd` there to get around it, which is checked the
same way.

Whenever work here needs another project, ask for what it takes rather
than work around it: a grant, as a question under `## Blocked` naming the
project, the reach, and what you would do with it; or, for a repository
that is not a splates project yet, leave to `splates init` it, which makes it
one any agent can reach. Run `splates projects grant <slug> <reach>` from that
project's directory, or `splates init` there, only once the user says so in
so many words, as in "let webappwiz run the queue here".
