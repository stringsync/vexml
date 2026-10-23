# Checkpoint

`[SPLATES CHECKPOINT]`, sent by the `splates server` page, means your process is
about to stop, as for a restart, and the next prompt picks the work up. Stop
where you are and start nothing new:

1. Leave a step you are in the middle of as it is, unless it is a `splates
   merge`: finish that first.
2. Bring `SPLATES.md` up to date: any `## Next` checked as it stands, each
   open question under `## Blocked`, and a line under the current `## Next`
   step saying what you were doing when stopped and what comes next. Add that
   step if the task had none. With no task, there is no `SPLATES.md`.
3. In a task, `splates checkpoint`: it commits what is uncommitted as a
   `WIP: checkpoint` commit and pushes the branch, so nothing is lost if the
   machine goes too. With no remote configured it leaves the tree alone.
   Squash the WIP commit away with the rest before merging, as Committing
   says.
4. Reply with one line on where you stand, and end your turn.

`[SPLATES RESUME]`, sent after a checkpoint, means carry on: read `SPLATES.md`
again and go on from where the current `## Next` step says you stopped.
With no task, carry on with what you were asked.
