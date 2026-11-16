# core/system

Interfaces for the things that touch the machine, so code under test doesn't
have to: `Fs` (filesystem), `Ps` (processes), `IpProvider`/`HostMapper`
(loopback IPs and hostname mapping), `PortProvider` (ports), plus `Lock`
and `HeavyJobs`, built on those seams.

```ts
import { NodeFs, NodePs } from "core/system";

const fs = new NodeFs();
const ps = new NodePs();

await fs.write("/tmp/x", "hi");
await fs.writeBytes("/tmp/y", new Uint8Array([1, 2, 3]));
await ps.spawn(["echo", "hi"]);
```

`spawn` and `spawnCapture` run a command to its end. `ps.start(argv)` leaves
the child's stdio open instead, as web streams, for one spoken to while it
runs, and `ps.startOnTerminal(argv, { cols, rows })` runs one on a terminal
of its own, as a terminal window runs a shell:

```ts
const agent = ps.start(["bunx", "some-acp-agent"], { cwd: "/repo" });
await agent.stdin.getWriter().write(new TextEncoder().encode("hi\n"));
for await (const bytes of agent.stdout) {
	// ...
}

const shell = ps.startOnTerminal(["/bin/sh"], { cols: 80, rows: 24 });
shell.write("ls\n");
shell.resize(120, 40);
```

`fs.append(path, data)` adds to the end of a file, so a log grows without being
rewritten whole.

`fs.watch(path, onChange, { recursive })` calls back with each path that
changes in `path` until its `dispose()`; `FakeFs` calls its watches on its own
writes, renames and removals.

In tests, swap in the fakes:

```ts
import { FakeFs, FakePs } from "core/system/testing";
```

A `Lock` is a mutex (`acquire`, `release`, `releaseIfOurs`). `acquire` blocks
until the lock is free, so there is no "busy" answer to ignore.

Every dependency here is optional and lives in the options object, defaulting
to the real implementation, so a caller with nothing to swap in passes nothing
and a test passes its fakes by name:
`new FileLock(path, { fs: new FakeFs() })`.

```ts
const lock = new FileLock("/path/to/some.lock");

await lock.acquire();
try {
	// ...
} finally {
	await lock.release();
}
```

`FileLock` holds the lock as a directory, so it works between processes:
`mkdir` is atomic everywhere, so there is no check-then-write window. A holder
that died is detected and its lock stolen: by its pid on this host, however long
it has held the lock, and by `stalenessMs` on another, unless `pidOnly` judges by pid whatever the
hostname, for hosts that rename. The directory is removed
on signals and uncaught exceptions.

`MemoryLock` holds nothing but itself, so it only serializes callers inside one
process that share the instance. Waiters are served in the order they arrived.

`HeavyJobs` caps the heavy jobs (test runs, installs) a machine runs at once,
so several agents testing together queue rather than run out of memory. Every
process that opens the same directory shares its slots, whichever tool it runs
in; a holder that dies gives its slot back by dying. What runs in a slot finds
`held` set in its environment, so a heavy job it starts runs in that slot
rather than waiting for another.

```ts
const heavy = HeavyJobs.under(`${home}/.tools`, {
	fs,
	ps,
	log,
	cap: 2,
	held: "TOOLS_HEAVY",
});
await using slot = await heavy.take({ what: "bun test" });
await ps.spawn(["bun", "test"], { env: slot.env });
```

A `PortProvider` answers which port to listen on, and `get()` takes nothing:
which ports it will consider is settled when it is made, so a server keeps a
predictable URL when it can and still starts when something already holds that
port.

```ts
// 4269 if it is open, else the next open port up to 4288
const port = await OpenPortProvider.span({ from: 4269, span: 20 }).get();

// exactly 5432, or a throw
const pg = await new OpenPortProvider({ from: 5432 }).get();

// 0, meaning whatever binds it chooses
const any = await OpenPortProvider.any().get();
```

A range that covers no ports, or reaches past 65535, throws when the provider
is made rather than when it is asked, so a bad one never reaches a caller.

`OpenPortProvider` binds each candidate and lets it go again, so the answer is
open at the moment it is given rather than when the caller acts on it. A caller
that cannot afford to lose that race should retry its own bind on `EADDRINUSE`
instead.

`makeUndumpable()` keeps other processes of the same user out of this one's
memory, for a daemon holding secrets beside programs it does not trust. Call
it once, at start; it cannot be undone. On Linux it clears the dumpable flag
(`prctl(PR_SET_DUMPABLE, 0)`), so only root can ptrace the process or read
its `/proc/<pid>/mem` and `environ`, and checks the flag took; on macOS it
calls `ptrace(PT_DENY_ATTACH)`. It throws when that call fails, and elsewhere
returns `{ undumpable: false, why }`. The programs it spawns are not covered.

```ts
import { makeUndumpable } from "core/system";

const guard = await makeUndumpable();
if (!guard.undumpable) {
	log.warn(guard.why);
}
```
