export interface Timer {
	setTimeout(callback: () => void, delay: Duration): number;
	clearTimeout(id: number): void;
}
