# core/creds

API keys and tokens, each named the way its environment variable is, read
from the sources the caller lists, the first with a value winning. The same
code reads them wherever it runs; only the list changes. Where the app is
deployed, that is the environment and maybe a `.env` file. On a person's
machine it is the operating system's secret store, where a value lives
encrypted rather than in a file, so it is in every git worktree of the
project without being in any of them, and an agent building or running the
code uses it without ever being shown it.

```ts
import {
	Credentials,
	DotenvFile,
	Environment,
	SystemSecretStore,
} from "core/creds";

const credentials =
	process.env.APP_ENV === "development"
		? new Credentials([
				await SystemSecretStore.forProject(),
				SystemSecretStore.device(),
			])
		: new Credentials([new Environment(), new DotenvFile(".env")]);

const key = await credentials.require("STRIPE_SECRET_KEY");
```

Which sources, in what order, and how the app tells where it is running are
the caller's to choose. The development list above reads only the store, so
a stray export or a forgotten `.env` is never what a dev run picks up.

- `Environment` is the process's environment variables. Bun loads a
  project's `.env` files into them itself, so under Bun it reads those too.
- `DotenvFile` reads `NAME=value` lines from one file, once. A missing file
  has nothing rather than failing.
- `SystemSecretStore` keeps values through `Bun.secrets`: the Keychain on
  macOS, Credential Manager on Windows, and on Linux a running secret
  service daemon such as GNOME Keyring or KWallet. `forProject(dir?)` is the
  project's, kept as `mono:<project>`; `device()` is the one every
  project on the machine shares, kept as `mono`. A headless server
  often has no secret service, which is why a deployed app lists the
  environment instead.

`Credentials` is a source itself, so a fallback pattern of your own is a
list of lists, and any object with a `label` and an async `get(name)` is a
source, such as one over a hosted secrets manager:

```ts
const vault: CredentialSource = {
	label: "the team vault",
	get: (name) => vaultClient.read(`app/${name}`),
};
const credentials = new Credentials([
	vault,
	new Credentials([new Environment(), new DotenvFile(".env")]),
]);
```

`require` throws when no source has it, naming where it looked; the error
never holds a value. `get` is the same with undefined instead, and `source`
says which source a value would come from without reading it out. A source
need not list what it holds, so code names what it needs. A `SecretStore`
lists its own with `names()`: the system cannot list a service's entries, so
`SystemSecretStore` keeps one more, `.names`, listing the rest, and refuses
any name an environment variable cannot have.

People put values in the stores with `bin/mono creds`, which reads them at a
hidden prompt:

```bash
bin/mono creds add STRIPE_SECRET_KEY
bin/mono creds add CLOUDFLARE_API_TOKEN --device
bin/mono creds list
bin/mono creds remove STRIPE_SECRET_KEY
bin/mono creds run -- bunx prisma migrate dev
```

`creds run` is for tools that read only their environment: it hands the
command what the stores keep, for that run alone, and never an export of a
credential the project names.

The project's name is the directory of the repository's main worktree, and
`forProject` finds it the same way the CLI does. `add` takes any name, and `list` shows what the
stores keep.

## Keeping a key from an agent

A program you do not trust with a key, such as an agent's CLI, can still
spend it through a `CredentialProxy`: a loopback HTTP proxy that forwards to
one upstream with the program's placeholder swapped for the real key.

```ts
import { CredentialProxy, MemorySecretStore } from "core/creds";
import { makeUndumpable } from "core/system";

await makeUndumpable();
const store = new MemorySecretStore();
await store.set("ANTHROPIC_API_KEY", keyFromTheCoordinator);

await using proxy = CredentialProxy.listen(store, {
	upstream: "https://api.anthropic.com",
	credential: "ANTHROPIC_API_KEY",
	header: "x-api-key",
});
ps.start(["claude"], {
	env: { ANTHROPIC_BASE_URL: proxy.url, ANTHROPIC_API_KEY: proxy.placeholder },
});
```

For OpenAI's API, as Codex calls it, the key goes as a bearer token under a
path: `upstream: "https://api.openai.com/v1"`, `header: "authorization"`,
`scheme: "Bearer"`, with `OPENAI_BASE_URL` and `OPENAI_API_KEY` set the same
way.

- `MemorySecretStore` keeps values in this process's memory alone: never on
  disk, in the environment, argv or a log. `clear()` or `dispose()` drops
  them all at once. Neither its label, its errors, `console.log` nor
  `JSON.stringify` of it shows a value.
- `CredentialProxy.listen` binds 127.0.0.1 on a free port. A request
  without its placeholder, random for each proxy, gets a 401 and reaches no
  upstream, so another local process cannot spend the key through it. It
  reads the key from its source on every request, so a rotated key needs no
  restart, and once the source has none it answers 503. It reaches only its
  upstream, which must be `https://` (or loopback), never follows a
  redirect, and streams responses through untouched, server-sent events and
  compressed bodies alike. `disposeAsync()` stops it.
- `makeUndumpable()` from `core/system` keeps the user's other
  processes, the agent's among them, out of the memory the key sits in. A
  program running as your own user can still read its own environment, so
  the placeholder is as private as that: run the program in a container
  where that matters.

`FakeSecretStore` in `core/creds/testing` is a map, so a test says
what is kept and sees what changed.
