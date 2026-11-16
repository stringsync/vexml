import type { StackDeployer } from "./stack-deployer";

/** Use it in tests to read a stack deploy back: it records calls in order and keeps stamps in memory. */
export class FakeStackDeployer implements StackDeployer {
	/** Each call, as `<verb> <stage>` or `stamp <stage> <version>`. */
	readonly calls: string[] = [];
	/** Stage to the stamp it holds. */
	readonly stamps = new Map<string, string>();
	/** Stages whose deploy throws. */
	readonly failing = new Set<string>();

	/** Stages whose login was checked, in order. */
	readonly signedIn: string[] = [];

	async signIn(stage: string): Promise<void> {
		this.signedIn.push(stage);
	}

	async synth(_dir: string, stage: string): Promise<void> {
		this.calls.push(`synth ${stage}`);
	}

	async deploy(_dir: string, stage: string): Promise<void> {
		this.calls.push(`deploy ${stage}`);
		if (this.failing.has(stage)) {
			throw new Error(`deploy to ${stage} failed`);
		}
	}

	async readStamp(stage: string): Promise<string | undefined> {
		return this.stamps.get(stage);
	}

	async writeStamp(stage: string, version: string): Promise<void> {
		this.calls.push(`stamp ${stage} ${version}`);
		this.stamps.set(stage, version);
	}
}
