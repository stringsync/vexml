import { beforeEach, describe, expect, it } from "bun:test";
import type { Storage } from "./storage";
import { UploadQueue } from "./upload-queue";

/** Keeps every upload in memory, and fails the ones it is told to. */
class MemoryStorage implements Storage {
	readonly saved = new Map<string, Uint8Array>();
	readonly failing = new Set<string>();

	async put(key: string, data: Uint8Array): Promise<void> {
		if (this.failing.has(key)) {
			throw new Error(`cannot save ${key}`);
		}
		this.saved.set(key, data);
	}

	async has(key: string): Promise<boolean> {
		return this.saved.has(key);
	}
}

/** Counts how often the queue tried again, and never waits. */
class CountingBackoff {
	retries = 0;

	async wait(): Promise<void> {
		this.retries++;
	}
}

function bytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

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
		await queue.add("a.txt", bytes("a"));

		expect(await storage.has("a.txt")).toBe(true);
	});

	it("tries a failed upload again before giving up", async () => {
		storage.failing.add("a.txt");

		await expect(queue.add("a.txt", bytes("a"))).rejects.toThrow();
		expect(backoff.retries).toBe(3);
	});
});
