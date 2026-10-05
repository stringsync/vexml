import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { startWebhookHarness, type WebhookHarness } from "./testing";

describe("webhook delivery", () => {
	let harness: WebhookHarness;

	beforeEach(async () => {
		harness = await startWebhookHarness();
	});

	afterEach(async () => {
		await harness.disposeAsync();
	});

	it("posts the event to the subscriber", async () => {
		await harness.deliver({ type: "invoice.paid", id: "evt_1" });
		expect(harness.received).toEqual([{ type: "invoice.paid", id: "evt_1" }]);
	});

	it("retries when the subscriber returns a 500", async () => {
		harness.failNext(500);
		await harness.deliver({ type: "invoice.paid", id: "evt_2" });
		expect(harness.attempts).toBe(2);
	});
});
