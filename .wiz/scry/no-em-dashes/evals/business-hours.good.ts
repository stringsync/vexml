export interface OpeningHours {
	label: string;
	open: number;
	close: number;
}

// Shown as "9–17" on the store page; the en dash marks a range of hours.
export const weekdayHours: OpeningHours = { label: "9–17", open: 9, close: 17 };
export const saturdayHours: OpeningHours = { label: "10–14", open: 10, close: 14 };

export function isOpen(hours: OpeningHours, hour: number): boolean {
	// Closing hour is exclusive: a shop open 9–17 is closed at 17:00.
	return hour >= hours.open && hour < hours.close;
}

export function describeHours(hours: OpeningHours): string {
	return `Open ${hours.label} (local time)`;
}
