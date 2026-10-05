export class Stamper {
	constructor(private clock: Clock) {}
}

const pad = (n: number): string => String(n).padStart(2, "0");
