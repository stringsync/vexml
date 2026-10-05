export function largest(words: string[], size: (w: string) => number): string {
	return words.toSorted((a, b) => size(b) - size(a))[0] ?? "";
}
