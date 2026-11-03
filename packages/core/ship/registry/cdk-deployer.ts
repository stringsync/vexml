import { NodePs, type Ps } from "core/system";
import type { StackDeployer } from "./stack-deployer";

export interface CdkDeployerOptions {
	/** The stack's name for a stage, as CDK and CloudFormation know it. */
	stackName: (stage: string) => string;
	/** The SSM parameter holding a stage's version stamp. */
	parameter: (stage: string) => string;
	/** Extra `cdk` arguments for a stage, such as `["--context", "stage=prod"]`. */
	args?: (stage: string) => string[];
	ps?: Ps;
}

/** Deploys with the `cdk` CLI and keeps the version stamp in an SSM parameter. */
export class CdkDeployer implements StackDeployer {
	private readonly ps: Ps;

	constructor(private readonly opts: CdkDeployerOptions) {
		this.ps = opts.ps ?? new NodePs();
	}

	async synth(dir: string, stage: string): Promise<void> {
		await this.cdk("synth", dir, stage, { extra: [] });
	}

	async deploy(dir: string, stage: string): Promise<void> {
		await this.cdk("deploy", dir, stage, {
			extra: ["--require-approval", "never"],
		});
	}

	async readStamp(stage: string): Promise<string | undefined> {
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture([
			"aws",
			"ssm",
			"get-parameter",
			"--name",
			this.opts.parameter(stage),
			"--query",
			"Parameter.Value",
			"--output",
			"text",
		]);
		if (exitCode === 0) {
			return stdout.trim() || undefined;
		}
		if (stderr.includes("ParameterNotFound")) {
			return undefined;
		}
		throw new Error(`aws ssm get-parameter: ${stderr.trim()}`);
	}

	async writeStamp(stage: string, version: string): Promise<void> {
		const { exitCode, stderr } = await this.ps.spawnCapture([
			"aws",
			"ssm",
			"put-parameter",
			"--name",
			this.opts.parameter(stage),
			"--value",
			version,
			"--type",
			"String",
			"--overwrite",
		]);
		if (exitCode !== 0) {
			throw new Error(`aws ssm put-parameter: ${stderr.trim()}`);
		}
	}

	private async cdk(
		verb: string,
		dir: string,
		stage: string,
		opts: { extra: string[] },
	): Promise<void> {
		const argv = [
			"bunx",
			"cdk",
			verb,
			this.opts.stackName(stage),
			...opts.extra,
			...(this.opts.args?.(stage) ?? []),
		];
		const { exitCode } = await this.ps.spawn(argv, { cwd: dir });
		if (exitCode !== 0) {
			throw new Error(`${argv.join(" ")} failed in ${dir}`);
		}
	}
}
