/** What `makeUndumpable` could do on this platform. */
export type Undumpable =
	| { undumpable: true; how: string }
	| { undumpable: false; why: string };

/** Which platform `makeUndumpable` acts for; this process's by default. */
export interface MakeUndumpableOptions {
	platform?: NodeJS.Platform;
}

const PR_GET_DUMPABLE = 3;
const PR_SET_DUMPABLE = 4;
const PT_DENY_ATTACH = 31;

/**
 * Keeps other processes of the same user out of this one's memory, for a
 * process holding secrets beside programs it does not trust, such as a
 * daemon keeping API keys while agents run as its own user. Call it once, at
 * start, before the process holds a secret: it cannot be undone.
 *
 * On Linux it clears the process's dumpable flag, so no process but root's
 * can ptrace it or read `/proc/<pid>/mem` or `/proc/<pid>/environ`, and it
 * leaves no core dump; it checks the flag took. On macOS it denies debuggers
 * the right to attach, which stops `lldb` and `ptrace`, though not root; a
 * Bun signed with the hardened runtime, as released, refuses them already,
 * and this keeps a locally built or re-signed one the same.
 * Elsewhere it does nothing and says why. It throws when the call fails
 * where it should work, since a caller relying on it must not carry on
 * unguarded.
 *
 * Children are not covered: the flag returns with each program they run, so
 * the programs it spawns can be ptraced as usual.
 */
export async function makeUndumpable(
	opts: MakeUndumpableOptions = {},
): Promise<Undumpable> {
	const platform = opts.platform ?? process.platform;
	if (platform === "linux") {
		const { dlopen, FFIType } = await import("bun:ffi");
		const { symbols } = openLibc(dlopen, {
			prctl: {
				args: [FFIType.i32, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
				returns: FFIType.i32,
			},
		});
		if (
			symbols.prctl(PR_SET_DUMPABLE, 0, 0, 0, 0) !== 0 ||
			symbols.prctl(PR_GET_DUMPABLE, 0, 0, 0, 0) !== 0
		) {
			throw new Error("prctl(PR_SET_DUMPABLE, 0) did not take");
		}
		return { undumpable: true, how: "prctl(PR_SET_DUMPABLE, 0)" };
	}
	if (platform === "darwin") {
		const { dlopen, FFIType } = await import("bun:ffi");
		const { symbols } = dlopen("libc.dylib", {
			ptrace: {
				args: [FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.i32],
				returns: FFIType.i32,
			},
		});
		if (symbols.ptrace(PT_DENY_ATTACH, 0, null, 0) !== 0) {
			throw new Error("ptrace(PT_DENY_ATTACH) failed");
		}
		return { undumpable: true, how: "ptrace(PT_DENY_ATTACH)" };
	}
	return {
		undumpable: false,
		why: `${platform} has no call that keeps a user's own processes out of each other's memory`,
	};
}

/** glibc's name first, then the bare one, as on musl systems. */
function openLibc<T extends Parameters<typeof import("bun:ffi").dlopen>[1]>(
	dlopen: typeof import("bun:ffi").dlopen,
	symbols: T,
): ReturnType<typeof import("bun:ffi").dlopen<T>> {
	try {
		return dlopen("libc.so.6", symbols);
	} catch {
		return dlopen("libc.so", symbols);
	}
}
