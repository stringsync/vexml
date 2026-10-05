import { describe, expect, it } from "bun:test";
import { FeatureFlags } from "./feature-flags";

describe("FeatureFlags", () => {
	it("calling isEnabled for an unknown flag returns false", () => {
		const flags = new FeatureFlags({});
		expect(flags.isEnabled("dark-mode")).toBe(false);
	});

	it("calling enable then isEnabled returns true", () => {
		const flags = new FeatureFlags({});
		flags.enable("dark-mode");
		expect(flags.isEnabled("dark-mode")).toBe(true);
	});

	it("isEnabled with a percentage rollout uses the user id", () => {
		const flags = new FeatureFlags({ "dark-mode": { rollout: 0.5 } });
		expect(flags.isEnabled("dark-mode", { userId: "user-1" })).toBe(true);
	});
});
