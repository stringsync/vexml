export function stamp(message: string, now: () => Date): string {
	return `${now().toISOString()} ${message}`;
}
