import { beforeEach, describe, expect, it } from "bun:test";
import { Duration, FakeClock } from "webappwiz/time";
import { Subscription } from "./subscription";

describe("Subscription renewal", () => {
	let clock: FakeClock;
	let subscription: Subscription;

	beforeEach(() => {
		clock = new FakeClock();
		subscription = Subscription.start(clock, { plan: "monthly" });
	});

	it("renews when the period ends", () => {
		clock.advance(Duration.days(31));
		expect(subscription.renewals()).toBe(1);
	});

	it("does not renew once cancelled", () => {
		subscription.cancel();
		clock.advance(Duration.days(31));
		expect(subscription.renewals()).toBe(0);
	});
});
