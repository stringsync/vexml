import { type Fs, NodeFs } from "core/system";
import { Duration } from "core/time";
import type { Publication, Registry } from "./registry";
import type { StackDeployer } from "./stack-deployer";

export interface AwsStackRegistryOptions {
	/** The stages to deploy, in order: each deploys only once the one before it has. */
	stages: readonly string[];
	deployer: StackDeployer;
	fs?: Fs;
}

/**
 * Use it to release an AWS (CDK) stack: the live version is the stamp on the
 * deployed stack, and a rerun deploys only the stages that lack the version.
 * `publish` deploys each stage in order and stops at the first failure.
 */
export class AwsStackRegistry implements Registry {
	readonly publishDeadline = Duration.mins(60);
	private readonly stages: readonly string[];
	private readonly deployer: StackDeployer;
	private readonly fs: Fs;

	constructor(opts: AwsStackRegistryOptions) {
		if (opts.stages.length === 0) {
			throw new Error("an AWS stack needs at least one stage to deploy");
		}
		this.stages = opts.stages;
		this.deployer = opts.deployer;
		this.fs = opts.fs ?? new NodeFs();
	}

	private get last(): string {
		return this.stages[this.stages.length - 1] as string;
	}

	async published(_name: string, version: string): Promise<boolean> {
		return (await this.deployer.readStamp(this.last)) === version;
	}

	async deployed(_name: string): Promise<string | undefined> {
		return this.deployer.readStamp(this.last);
	}

	async publish(dir: string): Promise<Publication> {
		const version = await this.version(dir);
		for (const stage of this.stages) {
			if ((await this.deployer.readStamp(stage)) === version) {
				continue;
			}
			await this.deployer.deploy(dir, stage, version);
			await this.deployer.writeStamp(stage, version);
		}
		return {};
	}

	/** A dry run: synthesizes each stage, which sends nothing out. */
	async pack(dir: string, _into: string): Promise<void> {
		const version = await this.version(dir);
		for (const stage of this.stages) {
			await this.deployer.synth(dir, stage, version);
		}
	}

	private async version(dir: string): Promise<string> {
		const manifest = JSON.parse(await this.fs.read(`${dir}/package.json`));
		if (typeof manifest.version !== "string") {
			throw new Error(`${dir}/package.json has no version to stamp`);
		}
		return manifest.version;
	}
}
