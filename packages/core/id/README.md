# core/id

A source of identifiers behind an interface, so code that has to name something
does not decide how. Nothing here imports `node:` or touches the DOM, and it
depends on nothing.

```ts
import { CounterIdProvider, UuidProvider } from "core/id";

const ids = new UuidProvider();
ids.next(); // "0b7f2c2a-…"
```

Swap in `CounterIdProvider` and a test can say which id it expects, rather than
matching a pattern or ignoring the field.

`UuidProvider` calls `crypto.randomUUID`, which needs a secure context in a
browser: it is there over https and on `http://localhost`, but not over plain
http to a LAN address.
