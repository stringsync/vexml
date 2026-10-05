import { describe, expect, it } from "bun:test";
import { Router } from "./router";

describe("Router", () => {
	it("captures a named segment", () => {
		const router = new Router(["/users/:id"]);
		expectMatch(router, "/users/42", { id: "42" });
	});

	it("prefers a static route over a parameter", () => {
		const router = new Router(["/users/:id", "/users/me"]);
		expectMatch(router, "/users/me", {});
	});

	it("does not match a longer path", () => {
		const router = new Router(["/users/:id"]);
		expect(router.match("/users/42/posts")).toBeUndefined();
	});
});

function expectMatch(router: Router, path: string, params: Record<string, string>): void {
	const match = router.match(path);
	expect(match).toBeDefined();
	expect(match?.params).toEqual(params);
}
