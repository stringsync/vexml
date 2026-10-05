import { describe, expect, it } from "vitest";
import { Leaderboard } from "./leaderboard";

describe("Leaderboard", () => {
	it("ranks the top three players by score", () => {
		const board = new Leaderboard();
		const scores = [120, 340, 90, 500, 275];
		for (let i = 0; i < scores.length; i++) {
			board.record(`player-${i}`, scores[i]);
		}
		expect(board.top(3)).toEqual(["player-3", "player-1", "player-4"]);
	});
});
