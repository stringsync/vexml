---
name: named-options-last
description: Settings go in one named opts object, after the parameters a caller cannot leave out.
files: "**/*.ts"
level: warning
complexity: medium
recommended: true
version: 0.0.14
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

## Good

What the call cannot omit first, the named options object last:

```ts
export interface WriteOptions {
	encoding?: string;
	mode?: number;
}

export function write(path: string, data: string, opts: WriteOptions): void {
	files.write(path, data, opts.encoding ?? "utf8");
}
```

An injected options object is the same shape, with a default so a caller
taking every default passes nothing:

```ts
export class Fetcher {
	constructor(
		private readonly http: Http,
		private readonly opts: RetryOptions = {},
	) {}
}
```

Optional dependencies ride in the same object, defaulted in the body, so the
caller that wants only the setting sets only the setting:

```ts
export interface ReaderOptions {
	encoding?: string;
	fs?: Fs;
}

export class Reader {
	private readonly fs: Fs;

	constructor(
		private readonly path: string,
		opts: ReaderOptions = {},
	) {
		this.fs = opts.fs ?? new NodeFs();
	}
}

new Reader("/etc/hosts");
new Reader("/etc/hosts", { encoding: "latin1" });
new Reader("/etc/hosts", { fs: new FakeFs() });
```

## Bad

Options ahead of the arguments the call cannot omit:

```ts
export function write(opts: WriteOptions, path: string, data: string): void {}
```

The type written in place, so no caller can name what it is passing:

```ts
export function write(path: string, opts: { encoding?: string; mode?: number }): void {}
```

Settings spread across positional parameters, where every call site counts
commas and every new setting is a change to all of them:

```ts
export function write(
	path: string,
	data: string,
	encoding: string,
	mode: number,
	append: boolean,
): void {}
```

Optional dependencies trailing the options object, which is what puts
`undefined` in a call that only wanted the setting after it:

```ts
export function read(path: string, opts: ReadOptions, fs?: Fs): void {}

read("/etc/hosts", { encoding: "latin1" }, new FakeFs());
```
