---
version: 0.0.36
---
# Tests own their state

Shared setup never owns state. It exists for one reason: to make a test
readable. Naming a step, hiding a noisy construction behind a verb, turning an
assertion into a sentence, all fine. Building the world the test runs against
is not, because a reader who has to open another file to learn what state a
test started in has lost the test.

State belongs to the test. Setup moves out of it in this order, and each step
down has to be earned:

1. In the `it` that needs it. Always start here.
2. In that `describe`'s `beforeEach`, when several tests share the scenario.
   It builds what those tests share and nothing else, carrying no value only
   one of them cares about: data a single test asserts on stays in that test.
3. In a shared helper, only when the setup for one test is unusually complex.
   It holds no data of its own. Whatever a test varies, the test passes in or
   does itself, and the helper keeps nothing between calls.

What buys a step down is complexity, never repetition. The same three lines of
setup written out in five tests is the readable version: the coordination the
tests are about is on the screen, and a reader following one test never leaves
it. Fold them away only when the setup is intricate enough that repeating it
hides what each test is doing.

A helper earns its place by what it takes out of the test body: an `if`, a
`for`, a construction the test cannot say in a line. A helper that only saves
typing has cost a reader the scenario and bought nothing.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
