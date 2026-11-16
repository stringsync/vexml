import type { Toolkit } from "@aws-cdk/toolkit-lib";
import type { Stack } from "aws-cdk-lib";
import { NodePs, type Ps } from "core/system";
import type { StackDeployer } from "../registry/stack-deployer";
import type { SignInAsk } from "../step-events";
import { SsoLogin } from "./sso-login";

/** The output each stack gets, carrying the version deployed with it. */
export const VERSION_OUTPUT = "ReleaseVersion";
/** Output used by commit-keyed deployments. */
export const COMMIT_OUTPUT = "DeployCommit";

/** The AWS profile and region one stack deploys and is read through. */
export interface AwsStackAccess {
	/** A profile from the AWS config; the ambient credentials when left out. */
	profile?: string;
	/** The region the profile defaults to; the ambient region when left out. */
	region?: string;
}

export interface ToolkitStackDeployerOptions {
	/** Stamp to carry; versioned releases keep ReleaseVersion by default. */
	stampOutput?: typeof VERSION_OUTPUT | typeof COMMIT_OUTPUT;
	/** The stacks to deploy, in order. Their names are the stages. */
	stacks: readonly Stack[];
	/**
	 * Each stack's profile and region by stack name; a stack not listed uses the
	 * ambient credentials. Ignored for deploying when you pass your own `toolkit`.
	 */
	access?: Readonly<Record<string, AwsStackAccess>>;
	/** Pass your own to configure how CDK deploys; a default `Toolkit` otherwise. */
	toolkit?: Pick<Toolkit, "fromAssemblyBuilder" | "synth" | "deploy">;
	/**
	 * Whether CloudFormation rolls back a failed deploy; `true` when left out.
	 * Pass `false` to keep a failed first create for fix-forward.
	 */
	rollback?: boolean;
	/** Reads the deployed version through the `aws` CLI. */
	ps?: Ps;
}

/**
 * Use it to deploy CDK stacks you already built: it adds a `ReleaseVersion`
 * output to each, so the version lands with the stack or not at all, then
 * synthesizes and deploys through AWS CDK's own toolkit. Reading the deployed
 * version needs the `aws` CLI signed in to the stack's account and region.
 * Add the output before the app synthesizes, so build the stacks and hand
 * them over without calling `app.synth()` first.
 */
export class ToolkitStackDeployer implements StackDeployer {
	private readonly stacks: ReadonlyMap<string, Stack>;
	private readonly toolkit?: ToolkitStackDeployerOptions["toolkit"];
	private readonly ps: Ps;
	private readonly rollback: boolean;
	private readonly stampOutput: string;
	private readonly access: Readonly<Record<string, AwsStackAccess>>;

	constructor(opts: ToolkitStackDeployerOptions) {
		this.stampOutput = opts.stampOutput ?? VERSION_OUTPUT;
		this.stacks = new Map(opts.stacks.map((stack) => [stack.stackName, stack]));
		this.toolkit = opts.toolkit;
		this.ps = opts.ps ?? new NodePs();
		this.rollback = opts.rollback ?? true;
		this.access = opts.access ?? {};
	}

	async synth(_dir: string, stage: string, version: string): Promise<void> {
		const { toolkit, source, stacks } = await this.prepare(stage, version);
		await toolkit.synth(source, { stacks });
	}

	async deploy(_dir: string, stage: string, version: string): Promise<void> {
		const { toolkit, source, stacks } = await this.prepare(stage, version);
		await toolkit.deploy(source, { stacks, rollback: this.rollback });
	}

	async signIn(stage: string, ask: SignInAsk | undefined): Promise<void> {
		const { profile, region } = this.access[stage] ?? {};
		await new SsoLogin(this.ps).ensure(profile, region, ask);
	}

	async readStamp(stage: string): Promise<string | undefined> {
		const { exitCode, stdout, stderr } = await this.ps.spawnCapture([
			"aws",
			"cloudformation",
			"describe-stacks",
			"--stack-name",
			this.stack(stage).stackName,
			"--query",
			`Stacks[0].Outputs[?OutputKey=='${this.stampOutput}'].OutputValue | [0]`,
			"--output",
			"text",
			...this.cliArgs(stage),
		]);
		if (exitCode === 0) {
			const found = stdout.trim();
			return found === "" || found === "None" ? undefined : found;
		}
		if (stderr.includes("does not exist")) {
			return undefined;
		}
		throw new Error(`aws cloudformation describe-stacks: ${stderr.trim()}`);
	}

	/** Nothing to write: the version deployed with the stack as its `ReleaseVersion` output. */
	async writeStamp(): Promise<void> {}

	private cliArgs(stage: string): string[] {
		const { profile, region } = this.access[stage] ?? {};
		return [
			...(profile === undefined ? [] : ["--profile", profile]),
			...(region === undefined ? [] : ["--region", region]),
		];
	}

	private stack(stage: string): Stack {
		const stack = this.stacks.get(stage);
		if (stack === undefined) {
			throw new Error(`no stack named "${stage}"`);
		}
		return stack;
	}

	private async prepare(stage: string, version: string) {
		const stack = this.stack(stage);
		const { CfnOutput, Stage } = await import("aws-cdk-lib");
		// CDK caches the assembly: all commit outputs must exist before the first synth.
		const stamped =
			this.stampOutput === COMMIT_OUTPUT ? this.stacks.values() : [stack];
		for (const target of stamped) {
			if (target.node.tryFindChild(this.stampOutput) === undefined) {
				new CfnOutput(target, this.stampOutput, { value: version });
			}
		}
		const root = Stage.of(stack);
		if (root === undefined) {
			throw new Error(`${stage} is not in an app`);
		}
		const lib = await import("@aws-cdk/toolkit-lib");
		const { profile, region } = this.access[stage] ?? {};
		const toolkit =
			this.toolkit ??
			new lib.Toolkit(
				profile === undefined && region === undefined
					? undefined
					: {
							sdkConfig: {
								baseCredentials: lib.BaseCredentials.awsCliCompatible({
									profile,
									defaultRegion: region,
								}),
							},
						},
			);
		const source = await toolkit.fromAssemblyBuilder(async () => root.synth());
		// Matches the stack by its path in the app, as `cdk deploy` does.
		const stacks = {
			strategy: lib.StackSelectionStrategy.PATTERN_MUST_MATCH,
			patterns: [stack.node.path],
		};
		return { toolkit, source, stacks };
	}
}
