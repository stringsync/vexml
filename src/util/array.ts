/** Returns the first element of an array or null if it doesn't exist. */
export const first = <T>(arr: T[]): T | null => arr[0] ?? null;

/** Returns the last element of an array or null if it doesn't exist. */
export const last = <T>(arr: T[]): T | null => arr[arr.length - 1] ?? null;
