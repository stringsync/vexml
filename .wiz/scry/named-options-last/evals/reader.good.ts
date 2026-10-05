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
