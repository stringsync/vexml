import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ToggleButton } from "./toggle-button";

describe("ToggleButton", () => {
	describe("when pressed", () => {
		it("rendering it pressed shows the pressed label", () => {
			render(<ToggleButton pressed label="Mute" />);
			expect(screen.getByRole("button").textContent).toBe("Muted");
		});
	});
});
