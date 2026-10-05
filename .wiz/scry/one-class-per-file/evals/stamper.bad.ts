export class Stamper {
	constructor(private clock: Clock) {}
}

export class Formatter {
	format(stamp: string): string {
		return stamp.trim();
	}
}
