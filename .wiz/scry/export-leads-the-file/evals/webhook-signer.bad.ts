import { createHmac } from "node:crypto";

class SignatureHeader {
	constructor(
		readonly timestamp: number,
		readonly digest: string,
	) {}

	toString(): string {
		return `t=${this.timestamp},v1=${this.digest}`;
	}
}

export class WebhookSigner {
	constructor(private secret: string) {}

	sign(body: string, timestamp = Math.floor(Date.now() / 1000)): string {
		const digest = createHmac("sha256", this.secret).update(`${timestamp}.${body}`).digest("hex");
		return new SignatureHeader(timestamp, digest).toString();
	}
}
