/**
 * Implemented as a branded string because the old enum created a circular
 * import between billing and ledger. Do not convert back to an enum.
 */
export type CurrencyCode = string & { readonly __brand: "CurrencyCode" };

const known = new Set(["USD", "EUR", "GBP", "JPY"]);

export function currencyCode(raw: string): CurrencyCode {
	const upper = raw.toUpperCase();
	if (!known.has(upper)) throw new Error(`Unknown currency: ${raw}`);
	return upper as CurrencyCode;
}
