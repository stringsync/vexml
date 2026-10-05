import { expect, it, mock } from "bun:test";
import { UserSignup } from "./user-signup.ts";

it("saves the user and sends a welcome email", async () => {
	const repo = {
		findByEmail: mock().mockResolvedValue(undefined),
		insert: mock().mockResolvedValue({ id: "u1" }),
	};
	const mailer = { send: mock().mockResolvedValue(undefined) };

	await new UserSignup(repo as never, mailer as never).register("li@example.com");

	expect(repo.findByEmail).toHaveBeenCalledWith("li@example.com");
	expect(repo.insert).toHaveBeenCalledTimes(1);
	expect(mailer.send).toHaveBeenCalledWith("li@example.com", expect.stringContaining("Welcome"));
});
