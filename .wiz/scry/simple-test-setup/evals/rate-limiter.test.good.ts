import { beforeEach, describe, expect, it } from "bun:test";
import { Duration, FakeClock } from "webappwiz/time";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
	let clock: FakeClock;
	let limiter: RateLimiter;

	beforeEach(() => {
		clock = new FakeClock();
		limiter = new RateLimiter(clock, { perMinute: 2 });
	});

	it("allows requests under the limit", () => {
		expect(limiter.tryAcquire("alice")).toBe(true);
		expect(limiter.tryAcquire("alice")).toBe(true);
	});

	it("refuses a request over the limit", () => {
		limiter.tryAcquire("alice");
		limiter.tryAcquire("alice");
		expect(limiter.tryAcquire("alice")).toBe(false);
	});

	it("allows requests again after a minute passes", () => {
		limiter.tryAcquire("alice");
		limiter.tryAcquire("alice");
		clock.advance(Duration.minutes(1));
		expect(limiter.tryAcquire("alice")).toBe(true);
	});
});
