import { constants } from "node:os";

/**
 * Collects a child's exit status from the kernel, for the runtime that can lose
 * it: call it with the child's pid when its `close` never comes.
 *
 * Returns the raw wait status for `decode`, or null while the child runs or
 * once someone else has reaped it. The whole thing is null where exits are not
 * lost: Node, and Bun anywhere but macOS.
 */
export const reap: ((pid: number) => number | null) | null =
	process.versions.bun && process.platform === "darwin" ? await load() : null;

const WNOHANG = 1;

async function load(): Promise<(pid: number) => number | null> {
	// Bun on macOS learns that a child exited from a one-shot kqueue event, and
	// under load it drops some: the child stays a zombie and `close` never comes
	// (oven-sh/bun#34069). `waitpid` with `WNOHANG` reaps a child that has
	// exited and returns at once for one that has not.
	const { dlopen, FFIType, ptr } = await import("bun:ffi");
	const { symbols } = dlopen("libc.dylib", {
		waitpid: {
			args: [FFIType.i32, FFIType.ptr, FFIType.i32],
			returns: FFIType.i32,
		},
	});
	const status = new Int32Array(1);
	return (pid) =>
		symbols.waitpid(pid, ptr(status), WNOHANG) === pid
			? (status[0] ?? 0)
			: null;
}

/** A wait status as a shell reports it: the exit code, or 128 + the signal. */
export function decode(status: number): number {
	const signal = status & 0x7f;
	return signal === 0 ? (status >> 8) & 0xff : 128 + signal;
}

/** The runtime and kernel race to report an exit; neither may hold up the other. */
export async function exitOf(
	child: {
		pid: number;
		exitCode: number | null;
		signalCode: number | NodeJS.Signals | null;
		exited: Promise<number>;
	},
	kernel: { reap(pid: number): number | null },
): Promise<number> {
	let timer: ReturnType<typeof setInterval> | undefined;
	const polled = new Promise<number>((resolve) => {
		// Give Bun a beat before taking a status out from under it.
		timer = setInterval(() => {
			if (child.exitCode !== null || child.signalCode !== null) {
				resolve(shellCode(child.exitCode, child.signalCode));
				return;
			}
			const status = kernel.reap(child.pid);
			if (status !== null) {
				resolve(decode(status));
			}
		}, 250);
	});
	try {
		return await Promise.race([
			child.exited.then((code) => shellCode(code, child.signalCode)),
			polled,
		]);
	} finally {
		clearInterval(timer);
	}
}

/** Shell status for either a normal exit or a signal death. */
export function shellCode(
	code: number | null,
	signal: number | NodeJS.Signals | null,
): number {
	if (!signal) {
		return code ?? 0;
	}
	const number =
		typeof signal === "number" ? signal : (constants.signals[signal] ?? 0);
	return 128 + number;
}
