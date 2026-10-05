export function stamp(message: string, clock: Clock): string {
	return `${clock.now().toISOString()} ${message}`;
}

export function stampAll(messages: string[], clock: Clock): string[] {
	return messages.map((m) => stamp(m, clock));
}
