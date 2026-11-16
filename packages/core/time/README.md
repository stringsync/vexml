# core/time

Time as a seam, in terms every runtime already provides: `Duration` (a length of
time, so no call site has to ask "millis or seconds?"), `Clock` (a source of
now), and `Timer` (future work). Nothing here imports `node:` or `Bun`: the
implementations use `performance` and `setTimeout`, which are globals in Node,
Bun, Deno, workers and browsers alike.

```ts
import { Duration, sleep, SystemClock, SystemTimer } from "core/time";

await sleep(Duration.secs(2));

const clock = new SystemClock();
const started = clock.now();
const elapsed = clock.now().subtract(started);

const timer = new SystemTimer();
const poll = timer.setInterval(() => check(), Duration.secs(5));
poll.dispose(); // cancelling is just releasing a resource
```

## How long, and when

`Clock` counts from an arbitrary origin (process start, page load), so it can
say how long something took and nothing else. `WallClock` is calendar time, as
Unix epoch milliseconds, and is the one that can say when.

```ts
import { SystemWallClock, timeAgo, Duration } from "core/time";

const wall = new SystemWallClock();

await db.insert(events).values({ at: wall.now() });
timeAgo(Duration.ms(wall.now() - row.at)); // "5 minutes ago"
```

Reach for `WallClock` whenever a timestamp is written down, read back, or
compared against one somebody else produced: a JWT `exp`, an HTTP `Date`, a row
in a database. A `Clock` reading means nothing outside the process that took it,
and starts again from zero on the next page load.

Measure elapsed time with `Clock` even so, because a wall clock steps when the
machine syncs with NTP or the user changes it.

## Pacing work

`Debouncer` waits for a burst to end and runs once. `Throttler` runs
immediately, then at most once per interval, so something keeps happening
throughout.

```ts
import { Debouncer, Duration, SystemTimer, Throttler } from "core/time";

const debouncer = new Debouncer(new SystemTimer(), Duration.ms(300));
input.addEventListener("input", () => debouncer.call(() => search(input.value)));
```

[core/task](../task) is the same idea one level up: somewhere to say
"this needs doing again" without saying when. Its queues take a `Debouncer` or a
`Throttler` to decide how a burst of triggers becomes runs.

## Deadlines

```ts
import { Duration, timeouts } from "core/time";

const inTime = await timeouts.race(timer, work, Duration.secs(5));
```

The work is not cancelled, because a promise cannot be: this decides how long
the caller waits. For the same thing driven by an `AbortSignal` rather than a
deadline, see [core/abort](../abort).

## Stopwatch

Elapsed time that can be paused, so the parts that should not count are left
out.

```ts
import { Stopwatch } from "core/time";

const stopwatch = new Stopwatch(clock);
stopwatch.start();
stopwatch.stop(); // pauses, keeping what has accrued
stopwatch.resume();
stopwatch.elapsed();
```

## Testing

Swap in the fakes so nothing waits on real time, or on today's date:

```ts
import { FakeClock, FakeTimer, FakeWallClock } from "core/time/testing";

const clock = new FakeClock();
clock.advance(Duration.mins(3));

const timer = new FakeTimer();
timer.fireTimeouts();
timer.fireIntervals();

const wall = new FakeWallClock(Date.parse("2026-01-01T00:00:00Z"));
wall.advance(Duration.hrs(2));
```
