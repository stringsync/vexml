# core/log

Logging behind a `Logger` interface.

```ts
import { ConsoleLogger } from "core/log";

const log = new ConsoleLogger();
log.info("hello");
```

Loggers wrap other loggers, so behavior composes. Use `MemoryLogger` in tests
to assert on entries.

## Color

`color` wraps a value in an escape sequence, nesting included.

```ts
log.info(`biome: ${color.green("success")}`);
```

Setting `NO_COLOR` to anything non-empty makes every wrapper return its value
untouched, [as agreed across the ecosystem](https://no-color.org). Color is
otherwise always on: output is not sniffed for a terminal, so a pipe still
carries escape sequences unless the variable is set.

```bash
NO_COLOR=1 wiz --help
```

`color.strip` removes the sequences from a string that is read rather than
displayed: a test assertion, a log file. Use it on anything asserted against,
since the code under test does not know whether `NO_COLOR` was set.
