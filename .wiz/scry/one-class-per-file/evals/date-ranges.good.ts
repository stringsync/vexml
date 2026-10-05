export interface DateRange {
	start: Date;
	end: Date;
}

export function overlaps(a: DateRange, b: DateRange): boolean {
	return a.start < b.end && b.start < a.end;
}

export function days(range: DateRange): number {
	const ms = range.end.getTime() - range.start.getTime();
	return Math.ceil(ms / 86_400_000);
}

export function contains(range: DateRange, date: Date): boolean {
	return range.start <= date && date < range.end;
}
