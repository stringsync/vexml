export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = keyOf(item);
		const group = groups.get(key);
		if (group) group.push(item);
		else groups.set(key, [item]);
	}
	return groups;
}

export function partition<T>(items: readonly T[], keep: (item: T) => boolean): [T[], T[]] {
	const kept: T[] = [];
	const dropped: T[] = [];
	for (const item of items) (keep(item) ? kept : dropped).push(item);
	return [kept, dropped];
}
