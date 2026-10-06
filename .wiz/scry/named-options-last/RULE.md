---
version: 0.0.38
---
# Named options last

A function's settings belong in one object, and that object goes last, after
the parameters a caller cannot leave out. The call then reads as the values it
has to pass followed by the choices it is making, and a new setting costs one
more key rather than one more position every existing caller has to count
past.

The parameter is named `opts`. Its type is written out and named after what it
configures: `WriteOptions` for `write`, `FetcherOptions` for `new Fetcher`. An
inline object type states the shape where nobody else can reach it: a caller
cannot declare a value of it, an implementation cannot spread it, and a reader
learns the settings by parsing a signature. A named type sitting beside the
function is the one place to say what the options are and what each of them
means.

An optional dependency belongs in `opts` too. A dependency the caller has to
supply stays a parameter of its own, where the signature can insist on it; one
that falls back to a real implementation is something the caller is choosing,
and it sits in `opts` with the rest of what can be left out, resolved in the
body rather than in the signature. Trailing such a dependency positionally is
what makes a caller write `undefined` to reach the parameter behind it, and
these are the parameters callers omit most often.

Its cases are in `evals/`: each `.good.` file follows the rule, and each
`.bad.` file breaks it.
