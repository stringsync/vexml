/** A share of an image, 0..1, as a percentage: one decimal, more for a sliver. */
export function percent(share: number): string {
	const value = share * 100;
	if (value > 0 && value < 0.1) {
		return `${value.toFixed(2)}%`;
	}
	return `${value.toFixed(1)}%`;
}
