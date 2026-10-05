export function read(path: string, opts: ReadOptions, fs?: Fs): void {}

read("/etc/hosts", { encoding: "latin1" }, new FakeFs());
