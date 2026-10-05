type PriceFormatter = (cents: number) => string;

const formatUsd: PriceFormatter = (cents) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export interface LineItem {
	name: string;
	cents: number;
	quantity: number;
}

export function priceLabel(item: LineItem): string {
	const total = formatUsd(item.cents * item.quantity);
	return item.quantity > 1 ? `${item.name} x${item.quantity}: ${total}` : `${item.name}: ${total}`;
}
