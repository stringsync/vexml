# Moving splates state

Splates keeps nothing in the working tree: a project's tasks, lanes, plans,
conversations and hooks are in a database under `~/.splates/projects`, and the agent roster and
Auto pick rules under `~/.splates`, so a clone or a push carries none of it.
When the user asks to move that state to another machine or project, back it
up, or bring it back, go through the project's replica, never a copy of those
directories, which takes along locks, leases and paths of this machine.

## Moving the server

To move `splates server` between machines, the Mac and a Droplet, or rebuild
a lost box, go through the project's replica (`replica` in
`splates.config.ts`: a bucket, or for a user without one a `dir` on a disk
both machines reach).

1. Checkpoint the agents (`[SPLATES CHECKPOINT]`) and ask the user to stop
   `splates server`, which flushes its last batch for up to ten seconds.
2. `splates replica status` must say it is caught up with nothing behind.
3. On the new machine, from a checkout of the project with the same
   `splates.config.ts` and a bucket's `REPLICA_ACCESS_KEY` and
   `REPLICA_SECRET_KEY` kept: `splates replica restore`. It stops on records
   already there unless `--force`, which leaves them aside.
4. Ask the user to start `splates server` there, which replicates on into the
   same replica. The agent roster and Auto pick rules are set up again.
5. Here, `splates replica retire <where it went>` leaves the records aside,
   so a splates run here says where the server is.
