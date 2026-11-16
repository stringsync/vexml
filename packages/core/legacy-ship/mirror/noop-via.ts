import type { GithubActions } from "../registry/github-actions";

/** The part of `GithubActions` a mirror build drives: pointing its run at the mirror's checkout. */
export type Via = Pick<GithubActions, "use">;

/** A `Via` for a mirror that publishes from this machine: there is no run to point anywhere. */
export class NoopVia implements Via {
	use(): void {}
}
