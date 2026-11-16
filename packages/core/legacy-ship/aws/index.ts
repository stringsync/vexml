import type { Stack } from "aws-cdk-lib";
import type { Fs, Ps } from "core/system";
import { AwsStackStep } from "../aws-stack-step";
import { AwsStackRegistry } from "../registry/aws-stack-registry";
import { RegistryArtifact } from "../registry/registry-artifact";
import { Release } from "../release";
import {
	type AwsStackAccess,
	COMMIT_OUTPUT,
	ToolkitStackDeployer,
} from "./toolkit-stack-deployer";

export {
	type AwsStackAccess,
	COMMIT_OUTPUT,
	ToolkitStackDeployer,
	type ToolkitStackDeployerOptions,
	VERSION_OUTPUT,
} from "./toolkit-stack-deployer";

/** What `awsStack` deploys, in the order it deploys it. */
export interface AwsStackOptions {
	/** The stacks to deploy, in order: each deploys only once the one before it has. */
	stacks: readonly Stack[];
	/**
	 * Each stack's AWS profile and region by stack name, for synthesizing,
	 * deploying and reading the live version. A stack not listed uses the
	 * ambient credentials.
	 */
	access?: Readonly<Record<string, AwsStackAccess>>;
	/**
	 * A question to ask before deploying a stack, by stack name. A deployment
	 * run from the Ships page asks it there; a no stops the deployment there,
	 * resumably.
	 */
	confirm?: Readonly<Record<string, string>>;
	/** Whether CloudFormation rolls back a failed deploy; `true` when left out. */
	rollback?: boolean;
	ps?: Ps;
	fs?: Fs;
}

/**
 * AWS (CDK) stacks, deployed as one ship step, the workspace package `name`: pass the
 * `cdk.Stack`s, staging before prod, and they deploy in that order through
 * AWS CDK's toolkit, stopping at the first failure. The version goes out as a
 * `ReleaseVersion` output of each stack, which is what the live version
 * reads. A dry run only synthesizes. Compose it into `releases.lockstep`
 * like any `releases.*`.
 *
 * Build the stacks and hand them over without calling `app.synth()` first.
 */
const versionedStack = (name: string, opts: AwsStackOptions): Release => {
	const stages = opts.stacks.map((stack) => stack.stackName);
	const deployer = new ToolkitStackDeployer({
		stacks: opts.stacks,
		access: opts.access,
		rollback: opts.rollback,
		ps: opts.ps,
	});
	return new Release([
		new RegistryArtifact(
			name,
			new AwsStackRegistry({ stages, deployer, fs: opts.fs }),
		),
	]);
};

/** Each stack is a deploy step and an artifact reporting its live commit. */
function stackSteps(opts: AwsStackOptions): AwsStackStep[] {
	if (opts.stacks.length === 0) {
		throw new Error("an AWS deployment needs at least one stack");
	}
	const deployer = new ToolkitStackDeployer({
		stacks: opts.stacks,
		access: opts.access,
		rollback: opts.rollback,
		ps: opts.ps,
		stampOutput: COMMIT_OUTPUT,
	});
	return opts.stacks.map(
		(stack) =>
			new AwsStackStep(
				stack.stackName,
				deployer,
				opts.confirm?.[stack.stackName],
			),
	);
}

/** Versioned release, or `awsStack.steps(options)` for commit-keyed deploys. */
export const awsStack = Object.assign(versionedStack, { steps: stackSteps });

export { AwsStackStep } from "../aws-stack-step";
