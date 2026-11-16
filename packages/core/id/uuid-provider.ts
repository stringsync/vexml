import type { IdProvider } from "./id-provider";

/**
 * Random v4 UUIDs from `crypto.randomUUID`, a global in Node 19+, Bun, Deno,
 * workers and browsers alike.
 *
 * In a browser it needs a secure context, so it is there over https and on
 * `http://localhost`, but not over plain http to a LAN address.
 */
export class UuidProvider implements IdProvider {
	next(): string {
		return crypto.randomUUID();
	}
}
