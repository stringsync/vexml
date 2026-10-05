---
version: 0.0.36
---
# Classes over function exports

A file should not export several functions that each take their dependencies
as parameters: injecting those dependencies in tests is awkward, and the
dependency list repeats at every call site. Group that behavior into a class
that receives its dependencies once, through its constructor.

Take an interface when the dependency has more than one implementation, or a
second one is coming: a fake for tests counts. A dependency with one
implementation and no second in sight is injected as the class it is, since an
interface with a single implementation is a file to keep in step and nothing
else.

There is no prescriptive mapping from functions to classes: one class may
absorb several related functions. A file exporting a single function is
acceptable, and pure helpers that take no dependencies may share a file
freely; the rule targets dependency-taking functions.

A cli action goes the other way, and is a function. It runs once, with its
options handed to it by the parser, and nothing else ever calls it, so a class
there is built at the call site, has one method called on it, and is dropped.
Give each action a file named for the command, `fix.ts` with `fix.test.ts`
beside it, and let its dependencies ride in the same options object the parsed
options arrive in, each one optional with the real one defaulted inside. That
is what a test needs to call the action with fakes, which is the only reason
to inject them.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
