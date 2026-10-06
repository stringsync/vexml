---
version: 0.0.38
---
# One class per file

A class is a file's whole idea; a second top-level class wants a file of its
own. A reader looking for a class finds it by its file name, and a file
holding two answers to that search with neither.

Class expressions do not count, and helpers alongside the one class share its
file freely: the rule is about top-level declarations.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
