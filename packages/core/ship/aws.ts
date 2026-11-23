import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Duration } from "core/time";
import {
	awaitChangeSet,
	explainFailure,
	recoverStuck,
	rollbackPaused,
	type StackRef,
	stackState,
	stackStatus,
	unsettled,
} from "./aws-rollback";
import type { Ctx } from "./ctx";
import { type Step, step } from "./step";

/** A stack of a CDK app, as the CDK CLI names it. */
export interface Stack {
	/** The stack's id in its app, as `cdk deploy` takes it (`Staging/Network`). */
	readonly name: string;
	/** The folder holding the app's `cdk.json`, from where the ship runs. */
	readonly app: string;
	/**
	 * The CloudFormation stack name, to override the one the app gives the
	 * stack. Leave it out: the deploy asks the app, which names a stack
	 * inside a stage from the stage's `stageName` (`prod-App` for `Prod/App`).
	 */
	readonly stackName?: string;
}

/**
 * The steps of deploying `stack`: sign in, diff, deploy and verify. Spread
 * them into a target's plan. The diff shows the change and asks the user to
 * confirm one that widens access or replaces resources; the deploy is
 * skipped when it already went out, so a resumed run deploys nothing twice.
 */
export function deploy(stack: Stack, opts: DeployOptions = {}): Step[] {
	// The diff step prepares one CloudFormation change set, the deploy's only
	// synth, and the deploy step executes that same change set.
	const { profile, noRollback = false } = opts;
	const cheap = opts.cheapReplacement ?? (noRollback ? CHEAP : []);
	const cdk = async (
		ctx: Pick<Ctx, "sh">,
		verb: string,
		// `stdoutOnly` keeps the CLI's notices, on stderr, out of what is parsed.
		{
			args = "",
			stdoutOnly = false,
		}: { args?: string; stdoutOnly?: boolean } = {},
	): Promise<string> => {
		const extra = (await opts.context?.(ctx)) ?? [];
		return locked(
			stack.app,
			`cd ${quote(stack.app)} && bunx aws-cdk@2 ${verb} ${quote(stack.name)}${args}${extra
				.map((arg) => ` ${quote(arg)}`)
				.join(
					"",
				)}${profile ? ` --profile ${quote(profile)}` : ""} --no-color${stdoutOnly ? "" : " 2>&1"}`,
		);
	};
	// The name is read once, when a step first needs it, with the same
	// context the change set synthesizes with.
	let named = stack.stackName;
	const cfnName = async (ctx: Pick<Ctx, "sh">): Promise<string> => {
		named ??= parseList(
			await ctx.sh(
				await cdk(ctx, "list", { args: " --long --json", stdoutOnly: true }),
			),
			stack.name,
		);
		return named;
	};
	const refFor = async (ctx: Pick<Ctx, "sh">): Promise<StackRef> => ({
		name: stack.name,
		cfnName: await cfnName(ctx),
		profile,
	});
	const aws = (verb: string) =>
		`aws ${verb}${profile ? ` --profile ${quote(profile)}` : ""}`;
	const describe = async (
		ctx: Pick<Ctx, "sh">,
		ref: StackRef,
		name = CHANGE_SET,
	) =>
		parseChangeSet(
			await ctx.sh(
				`${aws("cloudformation describe-change-set")} --stack-name ${quote(ref.cfnName)} --change-set-name ${quote(name)} --query '${CHANGE_SET_QUERY}' --output json 2>&1 || true`,
			),
		);
	// Synthesizes the app, publishes its assets and makes the change set
	// without running it. `--yes` lets the CLI roll back a stack a
	// `--no-rollback` deploy left paused in UPDATE_FAILED, which a deploy with
	// rollback on needs and the CLI otherwise asks a terminal to confirm.
	const prepare = async (
		ctx: Pick<Ctx, "sh">,
		ref: StackRef,
		rollback: boolean,
	): Promise<ChangeSet> => {
		await ctx.sh(
			await cdk(ctx, "deploy", {
				args: ` --method=prepare-change-set --change-set-name ${CHANGE_SET} --require-approval never --yes${rollback ? "" : " --no-rollback"}`,
			}),
		);
		const made = await describe(ctx, ref);
		if (!made) {
			throw new Error(
				`cdk deploy made no change set ${CHANGE_SET} for ${stack.name}`,
			);
		}
		if (made.failed) {
			throw new Error(
				`CloudFormation refused ${stack.name}'s change set: ${made.failed}`,
			);
		}
		if (made.id) {
			await writePrepared(ref, made.id);
		}
		return made;
	};
	// Asks before a change that widens access or replaces a costly resource.
	const confirmRisks = async (ctx: Ctx, found: ChangeSet) => {
		const risks = describeRisks(found, cheap);
		if (
			risks &&
			!(await ctx.confirm(`Deploy ${stack.name}? The change ${risks}.`))
		) {
			throw new Error(`Not deploying ${stack.name}: the change ${risks}`);
		}
		return risks;
	};

	const signIn =
		profile &&
		step({
			id: "sign-in",
			does: `Sign in to AWS as ${profile}`,
			done: async (ctx) =>
				(
					await ctx.sh(
						`aws sts get-caller-identity --profile ${quote(profile)} >/dev/null 2>&1 && echo signed-in || true`,
					)
				).includes("signed-in"),
			run: async (ctx) => {
				// Targets sharing a profile reach this together; the lock lets one
				// prompt, and the others find the session it made and skip it.
				await ctx.sh(
					locked(
						`aws-sso:${profile}`,
						`aws sts get-caller-identity --profile ${quote(profile)} >/dev/null 2>&1 || aws sso login --profile ${quote(profile)} --use-device-code --no-browser`,
					),
					{ prompts: true },
				);
				ctx.update(`Signed in as ${profile}`);
			},
		});

	return [
		...(signIn ? [signIn] : []),
		step({
			id: "diff",
			does: `Show what deploying ${stack.name} changes`,
			dependencies: signIn
				? ["sign-in", ...(opts.dependencies ?? [])]
				: opts.dependencies,
			run: async (ctx) => {
				const ref = await refFor(ctx);
				// A stack whose last rollback failed refuses every deploy, so
				// it is continued, once confirmed, before anything else.
				await recoverStuck(ctx, ref);
				const found = await prepare(ctx, ref, !noRollback);
				if (found.same) {
					ctx.update(`${stack.name} has no changes`);
					return;
				}
				const risks = await confirmRisks(ctx, found);
				ctx.update(
					risks ? `${stack.name} ${risks}` : `${stack.name} has changes`,
				);
			},
		}),
		step({
			id: "deploy",
			does: `Deploy ${stack.name}`,
			dependencies: ["diff"],
			// A deploy, then a rollback it waits out, can each take most of an hour.
			timeout: Duration.mins(150),
			// The diff step's change set ran and left the stack deployed, or
			// had nothing to change and the stack settled. Once a change set
			// executes, CloudFormation drops its short-name lookup, so an
			// executed change set is checked through the stack's ChangeSetId
			// ARN against the one this run prepared.
			done: async (ctx) => {
				const ref = await refFor(ctx);
				const found = await describe(ctx, ref);
				if (found) {
					if (found.same) {
						return !(await unsettled(ctx, ref));
					}
					if (found.execution === "EXECUTE_COMPLETE") {
						const status = await stackStatus(ctx, ref);
						return status !== undefined && DEPLOYED.has(status);
					}
					return false;
				}
				const expected = await readPrepared(ref);
				if (!expected) {
					return false;
				}
				const state = await stackState(ctx, ref);
				if (
					!state ||
					state.changeSetId !== expected ||
					!DEPLOYED.has(state.status)
				) {
					return false;
				}
				const executed = await describe(ctx, ref, expected);
				return executed?.execution === "EXECUTE_COMPLETE";
			},
			run: async (ctx) => {
				const ref = await refFor(ctx);
				await recoverStuck(ctx, ref);
				let found = await describe(ctx, ref);
				// A change set gone, failed or made stale by a change to the
				// stack since the diff step is made again, and its risks asked
				// again.
				if (!found || (!found.same && found.execution !== "AVAILABLE")) {
					found = await prepare(ctx, ref, !noRollback);
					if (!found.same) {
						await confirmRisks(ctx, found);
					}
				}
				if (found.same) {
					ctx.update(`${stack.name} has no changes`);
					return;
				}
				// CloudFormation refuses to disable rollback for a replacement,
				// cheap or a costly one the diff step had confirmed.
				const keepRollback = !noRollback || found.replaces.length > 0;
				// A stack a `--no-rollback` deploy left paused is rolled back
				// explicitly (`prepare-change-set` never does), then the change
				// set is made again against the rolled-back stack, with rollback on.
				if (keepRollback && noRollback && (await rollbackPaused(ctx, ref))) {
					const before = describeRisks(found, cheap);
					found = await prepare(ctx, ref, true);
					if (found.same) {
						ctx.update(`${stack.name} has no changes`);
						return;
					}
					if (describeRisks(found, cheap) !== before) {
						await confirmRisks(ctx, found);
					}
				}
				if (found.id) {
					await writePrepared(ref, found.id);
				}
				try {
					await ctx.sh(
						`${aws("cloudformation execute-change-set")} --stack-name ${quote(ref.cfnName)} --change-set-name ${CHANGE_SET}${keepRollback ? "" : " --disable-rollback"} 2>&1`,
					);
					const status = await awaitChangeSet(ctx, ref, found.id);
					if (!status || !DEPLOYED.has(status)) {
						throw new Error(
							`${stack.name}'s change set ended with the stack ${status ?? "in an unknown state"}`,
						);
					}
				} catch (error) {
					// Says what the failure left: a rollback, finished once it
					// settles and its services with it, a pause, or a failed
					// rollback that blocks the next deploy.
					throw await explainFailure(ctx, ref, error);
				}
				ctx.update(`Deployed ${stack.name}`);
			},
		}),
		step({
			id: "verify",
			does: `Check ${stack.name} finished deploying`,
			dependencies: ["deploy"],
			run: async (ctx) => {
				const ref = await refFor(ctx);
				const status = await stackStatus(ctx, ref);
				// A rolled-back stack is at its previous template, which is this
				// checkout's only when the change set had nothing to change.
				if (status === "UPDATE_ROLLBACK_COMPLETE") {
					if (!(await describe(ctx, ref))?.same) {
						throw new Error(
							`${stack.name}'s deploy did not finish: ${stack.name} is UPDATE_ROLLBACK_COMPLETE, rolled back to its previous version rather than this checkout. Retry the deploy step.`,
						);
					}
				} else if (!status || !DEPLOYED.has(status)) {
					const why = await unsettled(ctx, ref);
					if (why) {
						throw new Error(`${stack.name}'s deploy did not finish: ${why}`);
					}
				}
				await clearPrepared(ref);
				ctx.update(`${stack.name} is at this checkout`);
			},
		}),
	];
}

export interface DeployOptions {
	/**
	 * The AWS profile the stack deploys with. A profile signed in through
	 * SSO is signed in again when its session has lapsed; left out, the
	 * credentials come from the environment and there is no sign-in step.
	 */
	readonly profile?: string;
	/** Steps of the same target that finish before the first of these. */
	readonly dependencies?: readonly string[];
	/**
	 * Extra CDK arguments (`--context key=value`) for the synth that makes the
	 * deploy's change set, read when it runs so they can come from live state.
	 */
	readonly context?: (ctx: Pick<Ctx, "sh">) => Promise<readonly string[]>;
	/**
	 * Deploy with rollback off, so a failed deploy stays for a retry. A
	 * change that replaces a resource (cheap, or costly and confirmed by the
	 * diff step) deploys with rollback on, which CloudFormation requires.
	 */
	readonly noRollback?: boolean;
	/**
	 * CloudFormation types whose replacement is cheap: it asks no confirm, and
	 * with `noRollback` keeps rollback on. Defaults to
	 * `AWS::ECS::TaskDefinition` when `noRollback` is set, else none.
	 */
	readonly cheapReplacement?: readonly string[];
}

/**
 * The CloudFormation name `cdk list --long --json` gives the stack whose id
 * is `id` (`Prod/App`, named `prod-App` from its stage's `stageName`). The
 * list shows a stack inside a stage with its name after the id, as
 * `Prod/App (prod-App)`.
 */
export function parseList(output: string, id: string): string {
	const start = output.indexOf("[");
	const end = output.lastIndexOf("]");
	let stacks: unknown;
	try {
		stacks = JSON.parse(output.slice(start, end + 1));
	} catch {
		stacks = undefined;
	}
	if (start < 0 || !Array.isArray(stacks)) {
		throw new Error(
			`cdk list printed no stacks to read ${id}'s CloudFormation name from: ${output.trim().slice(0, 200)}`,
		);
	}
	const found = stacks.find(
		(one): one is { name: string } =>
			typeof one === "object" &&
			one !== null &&
			[id, `${id} (${(one as { name?: unknown }).name})`].includes(
				(one as { id?: unknown }).id as string,
			) &&
			typeof (one as { name?: unknown }).name === "string",
	);
	if (!found) {
		throw new Error(
			`cdk list names no stack ${id}, so its CloudFormation name is unknown; set stackName to name it`,
		);
	}
	return found.name;
}

/** What the deploy's CloudFormation change set would do to the stack. */
export interface ChangeSet {
	/** The change set's ARN, which the stack names once it ran. */
	readonly id: string;
	/** Whether the deployed stack already matches the app. */
	readonly same: boolean;
	/** `AVAILABLE` until it runs, then `EXECUTE_COMPLETE` or `EXECUTE_FAILED`. */
	readonly execution: string;
	/** Why CloudFormation could not make it, when it failed for more than having no changes. */
	readonly failed?: string;
	/** Whether the change adds or changes IAM, a resource policy or a security group. */
	readonly widens: boolean;
	/** The resources the change replaces, by logical id. */
	readonly replaces: readonly string[];
	/** The CloudFormation type of each replaced resource, in the same order. */
	readonly replacedTypes: readonly string[];
}

/** The name of the change set a deploy prepares and runs. */
const CHANGE_SET = "core-ship";

const CHANGE_SET_QUERY =
	"{Id:ChangeSetId,Status:Status,Reason:StatusReason,Execution:ExecutionStatus,Changes:Changes[].ResourceChange.{Action:Action,Type:ResourceType,Id:LogicalResourceId,Replacement:Replacement}}";

/** The statuses a change set leaves a stack in when it deployed. */
const DEPLOYED = new Set(["CREATE_COMPLETE", "UPDATE_COMPLETE"]);

const CHEAP = ["AWS::ECS::TaskDefinition"];

/**
 * Types whose change can widen access. The change set does not say whether a
 * change broadens or narrows it, so any added or changed one asks.
 */
const WIDENING =
	/^AWS::(IAM::(Role|Policy|ManagedPolicy|User|Group|InstanceProfile|RolePolicy|UserPolicy|GroupPolicy)|EC2::(SecurityGroup|SecurityGroupIngress|SecurityGroupEgress)|Lambda::Permission|S3::BucketPolicy|SQS::QueuePolicy|SNS::TopicPolicy)$/;

/**
 * Reads what `aws cloudformation describe-change-set` printed (with the
 * deploy's query), or `undefined` when the change set or its stack does
 * not exist.
 */
export function parseChangeSet(output: string): ChangeSet | undefined {
	let read: unknown;
	try {
		read = JSON.parse(output);
	} catch {
		if (/ChangeSetNotFound|does not exist/.test(output)) {
			return undefined;
		}
		throw new Error(
			`describe-change-set printed no change set: ${output.trim().slice(0, 200)}`,
		);
	}
	const set = read as {
		Id?: string;
		Status?: string;
		Reason?: string | null;
		Execution?: string;
		Changes?: {
			Action?: string;
			Type?: string;
			Id?: string;
			Replacement?: string | null;
		}[];
	} | null;
	const changes = set?.Changes ?? [];
	const same =
		set?.Status === "FAILED" &&
		/didn't contain changes|No updates are to be performed/.test(
			set.Reason ?? "",
		);
	const replaced = changes.filter(
		(change) =>
			change.Action === "Modify" &&
			(change.Replacement === "True" || change.Replacement === "Conditional"),
	);
	return {
		id: set?.Id ?? "",
		same,
		execution: set?.Execution ?? "",
		...(set?.Status === "FAILED" && !same
			? { failed: set.Reason || "no reason given" }
			: {}),
		widens: changes.some(
			(change) =>
				(change.Action === "Add" || change.Action === "Modify") &&
				WIDENING.test(change.Type ?? ""),
		),
		replaces: replaced.map((change) => change.Id ?? "a resource"),
		replacedTypes: replaced.map((change) => change.Type ?? "unknown"),
	};
}

/** What the confirm says about a diff, or nothing when it is safe. */
function describeRisks(
	diff: ChangeSet,
	cheap: readonly string[],
): string | undefined {
	const costly = diff.replaces.filter(
		(_, i) => !cheap.includes(diff.replacedTypes[i] ?? ""),
	);
	const parts = [
		diff.widens && "widens access",
		costly.length > 0 && `replaces ${costly.join(", ")}`,
	].filter(Boolean);
	return parts.length > 0 ? parts.join(" and ") : undefined;
}

// Runs `command` once nothing else holds the lock named `app` (an app folder
// or another key), because the
// CLI refuses to synth while another process reads `cdk.out`. The lock is a
// directory (`mkdir` is atomic) holding its owner's pid; a waiter clears it
// when that process is gone, and the owner removes it on exit.
function locked(app: string, command: string): string {
	const dir = `"\${TMPDIR:-/tmp}/cdk-lock-$(printf %s ${quote(app)} | cksum | cut -d' ' -f1)"`;
	return `( l=${dir}; until mkdir "$l" 2>/dev/null; do if ! kill -0 "$(cat "$l/pid" 2>/dev/null)" 2>/dev/null; then sleep 1; kill -0 "$(cat "$l/pid" 2>/dev/null)" 2>/dev/null || rm -rf "$l"; fi; sleep 1; done; echo $$ > "$l/pid"; trap 'rm -rf "$l"' EXIT; ${command} )`;
}

function quote(word: string): string {
	return /^[\w@%+=:,./-]+$/.test(word)
		? word
		: `'${word.replaceAll("'", `'\\''`)}'`;
}

// Persists the ARN of the change set this checkout's ship run prepared, so a
// resumed `deploy.done` process can tell it apart from an older ship's
// `Stacks[0].ChangeSetId` once CloudFormation drops short-name lookup.
function preparedPath(ref: StackRef): string {
	const key = createHash("sha256")
		.update(`${process.cwd()}\0${ref.profile ?? ""}\0${ref.cfnName}`)
		.digest("hex")
		.slice(0, 16);
	return join(tmpdir(), `ship-aws-${key}.txt`);
}

async function readPrepared(ref: StackRef): Promise<string | undefined> {
	try {
		const id = (await readFile(preparedPath(ref), "utf8")).trim();
		return id || undefined;
	} catch {
		return undefined;
	}
}

async function writePrepared(ref: StackRef, id: string): Promise<void> {
	await writeFile(preparedPath(ref), `${id}\n`);
}

async function clearPrepared(ref: StackRef): Promise<void> {
	await rm(preparedPath(ref), { force: true });
}
