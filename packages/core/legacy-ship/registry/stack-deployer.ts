import type { SignInAsk } from "../step-events";

/** What an AWS stack registry asks of AWS: a synth, a deploy per stage, and the version stamp. */
export interface StackDeployer {
	/** Synthesizes the stack in `dir` for `stage` as it would deploy `version`, sending nothing out. Throws if it does not build. */
	synth(dir: string, stage: string, version: string): Promise<void>;
	/** Deploys the stack in `dir` to `stage`, carrying `version` when the stack holds its own stamp. Throws if the deploy fails. */
	deploy(dir: string, stage: string, version: string): Promise<void>;
	/** The version stamped on the deployed stack of `stage`, or `undefined` when none is. */
	readStamp(stage: string): Promise<string | undefined>;
	/** Stamps `version` on the deployed stack of `stage`; a no-op when the deploy already carried it. */
	writeStamp(stage: string, version: string): Promise<void>;
	/** Makes sure `stage`'s AWS login is valid, asking the user to sign in through `ask` when it has expired. Throws if it cannot be. */
	signIn?(stage: string, ask: SignInAsk | undefined): Promise<void>;
}
