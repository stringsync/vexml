# Tending the project notes

`[SPLATES GARDEN]` starts you in the main tree for the notes gardener,
built-in automation `notes-gardener`, which the user turned on and pays for.
The paths after it are the notes to tend: each project note no queued task
names yet. Read [notes.md](notes.md) first for what a note is.

You draft the fixes yourself, all of them in one task the user reviews: you
never merge it. Start it before you read a note, from the main tree:

```sh
splates add notes-garden --goal "Tend the project notes: <what this run fixed>"
```

Work in the worktree it prints, and edit notes only, never code. While
`notes-garden` is open, `splates server` starts no other run, so one review
waits at a time.

## What to check

For each listed note, read it, then decide whether it is:

- **stale**: something it says is no longer true of the project, such as a
  convention the code no longer follows, a name, command or file it relies
  on that is gone, or a reason that no longer applies;
- **overlapping**: it says what another note says, so the two should be one;
- **doing several things**: it says more than one thing, each of which an
  agent would look for on its own;
- **contradicting**: it says the opposite of another note, any note in the
  notes directory, listed or not;
- **hard to read**: it does not follow Laying out a note in
  [notes.md](notes.md), such as a wall of paragraphs with no point up
  front, sentences of several claims each, or dated measurements mixed in
  with how things are;
- **vaguely described**: its description would not tell an agent reading
  only the descriptions, as `splates notes` lists them, what the note is
  about or when it bears on their work.

A fact with no tie to the code, such as what a client agreed to, cannot go
stale by the code: check it only against the other notes.

Bound what you read, since the gardener runs on the user's tokens for every
note: for each note, search for the names, commands and paths it mentions
(`rg`), and read at most a few files where they turn up, enough to confirm
or refute what it says. When that leaves you unsure, leave the note as it
is and move on; a later run, or the agent that next relies on it, can look
deeper.

## What to fix

Edit the notes in the worktree as [notes.md](notes.md) says to write them,
each with one thing to say and a one-line description:

- rewrite a stale note to what the code does now, citing where you found
  it only as the note itself would;
- merge overlapping notes into the one whose name fits best, removing the
  other;
- split a note that says several things into one file each;
- settle a contradiction where the code settles it, fixing the note that
  is wrong;
- lay out a hard-to-read note again, saying the same things;
- sharpen a vague description to say what the note is about.

A contradiction the code does not settle, such as two decisions each
reasoned and neither followed, is the user's call: ask it as a numbered
question, as [questions.md](questions.md) says, under `## Blocked`, with the
fix you would make as the `(chosen)` choice, and draft that fix meanwhile.
Change nothing that is sound.

Commit as you go. In `SPLATES.md`, list under `## Verification` each note
you changed, merged, split or removed, with what was wrong and what you
found in the code, so the user can review the change note by note.

## How it ends

- **Nothing to fix and nothing to ask**: `cd "$(splates path)"` and
  `splates remove notes-garden --reason nothing`, then end with the Removed
  report and how many notes you checked.
- **Questions open**: end your reply with them, the task waiting on their
  answers. Once they come, settle each note as answered, check them off and
  ask for the review.
- **Fixes drafted**: keep `- [ ] Show the user before merging` under
  `## Next` and end with the `## 🔍 Ready to merge notes-garden onto <base>`
  report, as [merge.md](merge.md) and [reporting.md](reporting.md) say: a
  line for each note changed, the demo how to read the task's diff, and
  `Checks:` naming what you searched. The user reads the change and replies
  "merge", or says what to change; only then do you merge.

Queue no task and defer none: the fixes you would queue are in your task,
and what is left unsure waits for a later run.
