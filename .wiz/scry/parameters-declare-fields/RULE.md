---
version: 0.0.36
---
# Parameters declare fields

A constructor parameter copied straight into a field of the same name writes
that name three times to say one thing. TypeScript declares the field from the
parameter: put the modifier on the parameter and delete both the declaration
and the assignment.

Only a plain `this.x = x` at the top of the constructor is that copy. A field
computed from a parameter, assigned under a condition, or named differently
from what it was given is a decision the constructor makes, and stays a
statement in the body.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
