---
version: 0.0.38
---
# Matchers over test logic

A test carries no `if` and no `for`. A branch in a test means the test does not
know what it expects, and a loop means the assertion is somewhere in the
middle of the file rather than at the end of the test: either way the reader
has to run the test in their head to learn what passing looks like, and a
failure points at the line that happened to blow up instead of at the claim
that broke.

Whatever the branch or the loop was deciding, a matcher already decides.
Compare the whole value at once with `toEqual`, ask about membership with
`toContainEqual`, and let the matcher report the difference. Where nothing
built in fits, name the claim as a matcher of your own with `expect.extend`
and keep the logic there, where it is written once and its failure message is
written with it.

The same goes for the setup around the assertion: a test builds its subject
straight through, and repetition across tests moves to `beforeEach` or a
harness rather than to a loop.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
