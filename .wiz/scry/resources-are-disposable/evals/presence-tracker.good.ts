import { Disposer, type Resource } from "webappwiz/disposable";

export class PresenceTracker implements Resource {
	private readonly disposer = new Disposer();
	private readonly online = new Set<string>();

	constructor(socket: Socket, timer: Timer) {
		this.disposer.use(socket.events.on("joined", ({ userId }) => this.online.add(userId)));
		this.disposer.use(socket.events.on("left", ({ userId }) => this.online.delete(userId)));
		this.disposer.use(timer.setInterval(() => socket.send({ type: "ping" }), Duration.seconds(30)));
	}

	isOnline(userId: string): boolean {
		return this.online.has(userId);
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
