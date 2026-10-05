export interface Timer {
	setTimeout(callback: () => void, delay: Duration): Resource;
}
