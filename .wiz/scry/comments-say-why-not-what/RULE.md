---
version: 0.0.36
---
# Comments say why, not what

Comments are sparse. A comment that describes what the code directly under it
does is unacceptable: the code already says that, and the comment will rot.
Comment only to explain why: why an unexpected code path exists, why the
obvious approach was not taken, why a constraint holds.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
