import { expect, it } from "vitest";
import { slugify } from "./slugify";

expect.extend({
	toBeSlugs(received: string[]) {
		const invalid: string[] = [];
		for (const slug of received) {
			if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
				invalid.push(slug);
			}
		}
		return {
			pass: invalid.length === 0,
			message: () => `not slugs: ${invalid.join(", ")}`,
		};
	},
});

it("turns every title into a slug", () => {
	const titles = ["Hello World", "  Spaces  Around ", "Ünïcode & Symbols!"];
	expect(titles.map(slugify)).toBeSlugs();
});
