import type { Database } from "./database";
import type { Logger } from "./logger";

export class OrderService {
	constructor(
		private readonly db: Database,
		private readonly logger: Logger,
	) {}

	async cancel(orderId: string): Promise<void> {
		await this.db.update("orders", orderId, { status: "cancelled" });
		this.logger.info("order cancelled", { orderId });
	}
}
