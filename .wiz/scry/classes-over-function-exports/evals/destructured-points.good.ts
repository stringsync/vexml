export function width({ left, right }: Span) {
	return right - left;
}

export function middle({ left, right }: Span) {
	return (left + right) / 2;
}
