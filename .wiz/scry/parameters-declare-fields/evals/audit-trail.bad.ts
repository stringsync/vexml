import type { EventBus } from "./event-bus";

export class AuditTrail {
	private readonly bus: EventBus;

	constructor(bus: EventBus) {
		this.bus = bus;
	}

	record(actor: string, action: string): void {
		this.bus.publish("audit", { actor, action, at: Date.now() });
	}
}
