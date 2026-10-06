---
version: 0.0.38
---
# Simple test setup

Tests use bun:test. A test file makes exactly one `describe` call: never
nested, never several side by side. Every test is an `it` whose string
completes the sentence "it …" naturally: the behavior comes first, the
condition after. If a title leads with the action under test instead of the
observable behavior, rewrite it.

A test file opens on what is being tested, not on the machinery that sets it
up or runs it. Shared setup lives in the `beforeEach` of the `describe` whose
tests need it, and stays there: it never moves out to a harness, because
`tests-own-their-state` keeps state where a reader can see it. A value a
test declares between its assertions, for the one after it, is that check's
input rather than setup, and stays beside the check. Loops,
iterators, and helper functions inside a test file are not banned, but each one
trades obviousness for cleverness: a reader should follow every test top to
bottom without executing anything in their head.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
