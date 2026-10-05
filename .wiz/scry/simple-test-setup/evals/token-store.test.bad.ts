import { beforeEach, describe, expect, it } from "bun:test";
import { TokenStore } from "./token-store";

describe("TokenStore", () => {
	let store: TokenStore;

	beforeEach(() => {
		store = new TokenStore();
	});

	describe("save", () => {
		it("stores the token for the user", () => {
			store.save("alice", "abc");
			expect(store.get("alice")).toBe("abc");
		});
	});

	describe("revoke", () => {
		it("forgets the token for the user", () => {
			store.save("alice", "abc");
			store.revoke("alice");
			expect(store.get("alice")).toBeUndefined();
		});
	});
});
