import type { Http } from "./http";

export class PaymentError extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "PaymentError";
	}
}

export class PaymentClient {
	constructor(private readonly http: Http) {}

	async charge(customerId: string, cents: number): Promise<string> {
		const response = await this.http.post("/charges", { customerId, cents });
		if (!response.ok) {
			throw new PaymentError(response.body.code, response.body.message);
		}
		return response.body.id;
	}
}
