// Fs is implemented by NodeFs and FakeFs, so that is what the parameter is
export class Reader {
	constructor(private fs: NodeFs) {}
}
