---
version: 0.0.38
---
# Fakes over mocks

A test thick with `mock` and `spyOn` calls is a signal, not a style: the code
under test wants a dependency it can be handed, so hand it a fake. Do not fake
a huge surface like a Web API; define a focused interface that names what the
code actually does with the dependency, and fake that. The production class
implements it against the real thing, the fake implements it in a few lines,
and the mocks disappear.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
