import { beforeEach, describe, expect, it } from "bun:test";
import { UploadQueue } from "./upload-queue";
import { CountingBackoff, MemoryStorage } from "./testing";

const text = new TextEncoder().encode("a");

describe("UploadQueue", () => {
	let storage: MemoryStorage;
	let backoff: CountingBackoff;
	let queue: UploadQueue;

	beforeEach(() => {
		storage = new MemoryStorage();
		backoff = new CountingBackoff();
		queue = new UploadQueue(storage, backoff);
	});

	it("saves each upload it is given", async () => {
		await queue.add("a.txt", text);

		expect(await storage.has("a.txt")).toBe(true);
	});

	it("tries a failed upload again before giving up", async () => {
		storage.failing.add("a.txt");

		await expect(queue.add("a.txt", text)).rejects.toThrow();
		expect(backoff.retries).toBe(3);
	});
});
