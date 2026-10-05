export abstract class ShippingRate {
	abstract quote(weightGrams: number): number;
}

export class FlatRate extends ShippingRate {
	constructor(private readonly cents: number) {
		super();
	}

	quote(): number {
		return this.cents;
	}
}

export class WeightRate extends ShippingRate {
	constructor(private readonly centsPerKilo: number) {
		super();
	}

	quote(weightGrams: number): number {
		return Math.ceil((weightGrams / 1000) * this.centsPerKilo);
	}
}
