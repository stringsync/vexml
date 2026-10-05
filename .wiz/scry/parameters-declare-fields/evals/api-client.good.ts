import type { KeyValueStore } from "./key-value-store";

export class ApiClient {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;
	private readonly cache: KeyValueStore;

	constructor(url: string, storage: KeyValueStore, timeoutMs?: number) {
		this.baseUrl = url.replace(/\/+$/, "");
		this.cache = storage;
		this.timeoutMs = timeoutMs ?? 5000;
	}

	async get(path: string): Promise<unknown> {
		const hit = await this.cache.get(path);
		if (hit !== undefined) return hit;
		const response = await fetch(`${this.baseUrl}${path}`, {
			signal: AbortSignal.timeout(this.timeoutMs),
		});
		return response.json();
	}
}
