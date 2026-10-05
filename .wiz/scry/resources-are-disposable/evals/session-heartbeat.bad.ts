export class SessionHeartbeat {
	private lastSeen = Date.now();

	constructor(
		private readonly api: SessionApi,
		document: Document,
	) {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") this.beat();
		});
		setInterval(() => this.beat(), 60_000);
	}

	private beat(): void {
		this.lastSeen = Date.now();
		void this.api.touch(this.lastSeen);
	}
}
