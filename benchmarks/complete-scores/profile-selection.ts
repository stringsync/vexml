export interface ProfileEntry {
	id: string;
	file: string;
}

export function selectProfileEntries<T extends ProfileEntry>(
	entries: T[],
	score: string,
): T[] {
	const selected = entries.filter(
		(entry) => score === 'all' || entry.id === score,
	);
	if (selected.length === 0) {
		throw new Error(`unknown score: ${score}`);
	}
	return selected;
}

export function profileRanges(id: string, requested: string): string[] {
	if (requested) {
		return requested.split(',');
	}
	if (id.includes('beethoven')) {
		return ['1-8', '248-255', '495-502', 'all'];
	}
	if (id.includes('dvorak')) {
		return ['1-8', '423-430', '846-853', 'all'];
	}
	return ['all'];
}
