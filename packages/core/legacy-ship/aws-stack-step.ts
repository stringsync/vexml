import { Duration } from "core/time";
import type { DeployArtifact, DeployContext } from "./deploy";
import type { StackDeployer } from "./registry/stack-deployer";
import type { Step } from "./step";

/** One stack deployed at the context's commit, independently resumable. */
export class AwsStackStep implements Step<DeployContext>, DeployArtifact {
	readonly deadline = Duration.mins(60);
	readonly stage = "publish";
	constructor(
		readonly name: string,
		private readonly deployer: StackDeployer,
		readonly confirm?: string,
	) {}

	async deployed(): Promise<string | undefined> {
		return this.deployer.readStamp(this.name);
	}

	async run(context: DeployContext): Promise<void> {
		await this.deployer.signIn?.(this.name, context.askSignIn);
		if ((await this.deployed()) === context.commit) {
			return;
		}
		await this.deployer.deploy(context.root, this.name, context.commit);
		await this.deployer.writeStamp(this.name, context.commit);
	}

	async dryRun(context: DeployContext): Promise<void> {
		await this.deployer.synth(context.root, this.name, context.commit);
	}
}
