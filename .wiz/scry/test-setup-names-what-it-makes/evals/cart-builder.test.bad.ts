export class Testing {
	readonly cart = new Cart();

	withItems(...items: Item[]): this {
		for (const item of items) this.cart.add(item);
		return this;
	}
}
