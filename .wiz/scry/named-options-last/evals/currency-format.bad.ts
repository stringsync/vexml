export function formatCurrency(
	amountCents: number,
	currency: string,
	locale: string,
	fractionDigits: number,
	useGrouping: boolean,
): string {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
		useGrouping,
	}).format(amountCents / 100);
}

export const price = formatCurrency(129900, "USD", "en-US", 2, true);
