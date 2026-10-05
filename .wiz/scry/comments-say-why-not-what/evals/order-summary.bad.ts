export interface LineItem {
	sku: string;
	unitPrice: number;
	quantity: number;
}

export function orderSummary(items: LineItem[], taxRate: number) {
	// add up the price times quantity of every line item
	const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
	const tax = Math.round(subtotal * taxRate);
	return { subtotal, tax, total: subtotal + tax };
}
