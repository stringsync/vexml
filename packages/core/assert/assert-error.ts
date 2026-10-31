/** What every `assert` and `ensure` check throws when it does not hold. */
export class AssertError extends Error {
	constructor(message?: string) {
		super(message ?? "assertion failed");
		this.name = "AssertError";
	}
}
