/**
 * Lock is a mutex seam. `acquire` blocks until the lock is free: there is
 * deliberately no "busy" return, so callers cannot wander off and do work they
 * are not holding the lock for.
 */
export interface Lock {
	acquire(): Promise<void>;
	release(): Promise<void>;
	/** Releases only if this process is the recorded holder. */
	releaseIfOurs(): Promise<void>;
}
