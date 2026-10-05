import { afterEach, expect, it, spyOn } from "bun:test";
import { ThemePreference } from "./theme-preference.ts";

afterEach(() => {
	localStorage.clear();
});

it("restores the saved theme", () => {
	const getItem = spyOn(Storage.prototype, "getItem").mockReturnValue("dark");
	expect(new ThemePreference().current()).toBe("dark");
	expect(getItem).toHaveBeenCalledWith("theme");
});

it("persists a newly chosen theme", () => {
	const setItem = spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
	new ThemePreference().choose("light");
	expect(setItem).toHaveBeenCalledWith("theme", "light");
});
