import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhook(body: string, signature: string, secret: string): boolean {
	const expected = createHmac("sha256", secret).update(body).digest("hex");
	// Compare in constant time — a plain === leaks how many bytes matched.
	const a = Buffer.from(expected, "hex");
	const b = Buffer.from(signature, "hex");
	return a.length === b.length && timingSafeEqual(a, b);
}
