export type Parcel = { weightGrams: number; destination: string };

const baseRates: Record<string, number> = {
	domestic: 499,
	europe: 1299,
	world: 1899,
};

export function zoneFor(destination: string): keyof typeof baseRates {
	if (destination === "US") return "domestic";
	if (["DE", "FR", "NL", "ES", "IT"].includes(destination)) return "europe";
	return "world";
}

export function shippingCents(parcel: Parcel): number {
	const base = baseRates[zoneFor(parcel.destination)];
	const extraKilos = Math.max(0, Math.ceil(parcel.weightGrams / 1000) - 1);
	return base + extraKilos * 150;
}
