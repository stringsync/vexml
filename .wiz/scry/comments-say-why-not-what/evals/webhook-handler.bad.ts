import { createHmac, timingSafeEqual } from "node:crypto";

export async function handleWebhook(request: Request, secret: string): Promise<Response> {
	const body = await request.text();
	const signature = request.headers.get("x-signature") ?? "";
	const expected = createHmac("sha256", secret).update(body).digest("hex");
	// compare the signature with the expected signature
	if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
		return new Response("invalid signature", { status: 401 });
	}
	const event = JSON.parse(body) as { type: string };
	console.info(`received ${event.type}`);
	return new Response("ok");
}
