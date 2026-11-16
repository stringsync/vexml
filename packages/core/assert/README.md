# core/assert

The invariants a type cannot state, checked at runtime. Nothing here imports
`node:` or touches the DOM, so it loads on a server and in a browser alike, and
it depends on nothing.

`assert` narrows a type, `ensure` hands the value back, so the same check works
as a statement or in an expression.

```ts
import { assert, ensure } from "core/assert";

assert.present(user, "no user on the session");
user.name; // narrowed

const port = ensure.integer(raw, "PORT must be a whole number");
```

Both throw `AssertError`. `assert.unreachable()` states that control cannot get
here, which is what the default of an exhaustive switch wants.

This is for what should never happen. Input arriving from outside the program
is not that: parse it with [Zod](https://zod.dev), which is built to tell a caller
what was wrong with what they sent.
