export class Product {
	id: string;
	name: string;
	priceCents: number;

	constructor(id: string, name: string, priceCents: number) {
		this.id = id;
		this.name = name;
		this.priceCents = priceCents;
	}

	label(): string {
		return `${this.name} ($${(this.priceCents / 100).toFixed(2)})`;
	}
}
