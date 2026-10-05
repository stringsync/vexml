import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ToggleButton } from "./toggle-button";

describe("ToggleButton", () => {
	it("shows its label while released", () => {
		render(<ToggleButton label="Mute" />);
		expect(screen.getByRole("button").textContent).toBe("Mute");
	});

	it("shows the pressed label while pressed", () => {
		render(<ToggleButton pressed label="Mute" />);
		expect(screen.getByRole("button").textContent).toBe("Muted");
	});
});
