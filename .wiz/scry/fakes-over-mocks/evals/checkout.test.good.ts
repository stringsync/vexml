interface Charges {
	charge(amount: number): void;
}

class FakeCharges implements Charges {
	readonly amounts: number[] = [];

	charge(amount: number): void {
		this.amounts.push(amount);
	}
}

it("charges the card for the cart total", () => {
	const charges = new FakeCharges();
	new Checkout(charges).buy(apple);
	expect(charges.amounts).toEqual([apple.price]);
});
