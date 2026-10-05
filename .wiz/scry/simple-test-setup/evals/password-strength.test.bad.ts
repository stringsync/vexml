import { describe, expect, it } from "bun:test";
import { strength } from "./password-strength";

const cases: Array<[string, "weak" | "fair" | "strong"]> = [
	["abc", "weak"],
	["password1", "weak"],
	["Tr0ub4dor", "fair"],
	["correct horse battery staple", "strong"],
	["X9!kq#2LmZ@p", "strong"],
];

describe("strength", () => {
	for (const [password, expected] of cases) {
		it(`rates ${password} as ${expected}`, () => {
			expect(strength(password)).toBe(expected);
		});
	}
});
