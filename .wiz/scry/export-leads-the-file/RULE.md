---
version: 0.0.38
---
# Export leads the file

A file is named after one export, and that export is the reason to open the
file. It goes near the top, where a reader lands. Anything that pushes it down
the screen is paying for itself with someone else's time.

Types and constants the export depends on may sit above it: a reader meets a
name and its shape in one place, and neither is what they came for. A wall of
them is still a wall, so keep what sits above the export short enough that the
export is on the first screen. Imports do not count, since editors fold them and
readers skip them: the first screen starts at the first statement below them.
When a type and a value both carry the file's name, like a hook `useFiles` and
`type Files = ReturnType<typeof useFiles>`, the value is the export that leads.

Helper classes and functions never sit above it. Prefer no helper at all: a
step only this file takes is a private method of the class, where it is already
in reach of the state it needs. When a helper genuinely has to be free
standing, declare it with `function` at the bottom of the file, below the
export it serves, so a reader meets it only after they have read what calls it.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
