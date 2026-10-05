import { describe, expect, it, vi } from "vitest";
import { Session } from "./session";

describe("Session", () => {
	it("expires if idle for thirty minutes", () => {
		vi.useFakeTimers();
		const session = new Session({ idleMinutes: 30 });
		vi.advanceTimersByTime(30 * 60 * 1000);
		expect(session.expired()).toBe(true);
	});

	it("stays alive for as long as it is touched", () => {
		vi.useFakeTimers();
		const session = new Session({ idleMinutes: 30 });
		vi.advanceTimersByTime(20 * 60 * 1000);
		session.touch();
		vi.advanceTimersByTime(20 * 60 * 1000);
		expect(session.expired()).toBe(false);
	});
});
