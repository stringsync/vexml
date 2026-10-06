---
version: 0.0.38
---
# Test setup names what it makes

Nothing a test uses is called a harness. Not a `TestHarness` class, not a
`harness` variable, not a `makeHarness` function, and not "the harness" in a
comment about one. The word names machinery, and machinery is the one thing a
reader does not need to know about: what they need is what the setup made.

Setup is named for that instead. A function that builds a repository is
`repo()`, one that builds a stocked cart is `cartOf(...)`, one that starts a
browser is `browser()`. The name says what comes back, so a test that calls it
reads without opening the other file.

The plain words a test framework already uses are fine, because they say what
they are: `setup`, `beforeEach`, `deps`, `fixture`. What is banned is the word
that stands in for the domain rather than naming it.

One piece of apparatus may be named for itself: a class called `Testing`,
exported from a module's `testing.ts`. It is instantiable, and what it holds
is the dependencies a test runs against, the fakes and the wiring between
them, so a test that needs all of them gets them in one line. It is allowed
where a harness is not because it claims nothing: it does not pretend to be a
checkout or a cart, and the test still names every domain thing it got.

Reaching for one is the last step, not the first. Setup belongs in the `it`
that needs it, then in that `describe`'s `beforeEach` when several tests share
it, and only then in a `Testing` object, once wiring the dependencies in each
test hides the behavior under test. Small enough to say in a line or two means
it stays in the test. A `Testing` object coordinates dependencies; the state a
test is about stays with the test, as `tests-own-their-state` says.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
