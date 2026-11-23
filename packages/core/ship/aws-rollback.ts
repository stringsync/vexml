// Follows what a failed deploy left a CloudFormation stack in: a rollback
// still running, a finished one, a `--no-rollback` pause, or a rollback that
// itself failed and blocks every later deploy until it is continued.
import type { Ctx } from "./ctx";

/** How the aws CLI reaches a stack. */
export interface StackRef {
	/** The CloudFormation stack name (`Staging-Network` for `Staging/Network`). */
	readonly cfnName: string;
	/** The name the ship shows (`Staging/Network`). */
	readonly name: string;
	readonly profile?: string;
}

/** How many times the watch polls a stack or a service before it gives up. */
export const POLLS = 240;
/** Seconds between polls. */
export const POLL_SECONDS = 15;
/** Consecutive failed `describe-stacks` polls before `awaitChangeSet` gives up. */
export const POLL_FAILURES = 3;

const FATAL_AWS_ERROR =
	/ExpiredToken|Token has expired|SSO session.*expired|aws sso login|UnrecognizedClientException|InvalidClientTokenId|AccessDenied|Unable to locate credentials|config profile .* could not be found|does not exist/i;

/** The stack's status, or `undefined` when it does not exist. */
export async function stackStatus(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
): Promise<string | undefined> {
	const out = await ctx.sh(
		`${aws(ref, "cloudformation describe-stacks")} --stack-name ${quoteWord(ref.cfnName)} --query 'Stacks[0].StackStatus' --output text 2>&1 || true`,
	);
	return out.match(/\b([A-Z]+(?:_[A-Z]+)+)\b/)?.[1];
}

/**
 * The statuses a stack's resources match its template in: a create or
 * update that finished, or an update rolled back to its previous template.
 * Any other (`UPDATE_FAILED` left by `--no-rollback`, a failed rollback, a
 * create rolled back, anything in progress) can store a template its
 * resources never reached, so an empty diff there proves nothing.
 */
const SETTLED = new Set([
	"CREATE_COMPLETE",
	"UPDATE_COMPLETE",
	"UPDATE_ROLLBACK_COMPLETE",
	"IMPORT_COMPLETE",
]);

/**
 * Why the stack's resources may not match its stored template, naming its
 * status and the resources that failed, or `undefined` when it settled.
 */
export async function unsettled(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
): Promise<string | undefined> {
	const status = await stackStatus(ctx, ref);
	if (status && SETTLED.has(status)) {
		return undefined;
	}
	if (!status) {
		return `${ref.name} has no stack status.`;
	}
	const failed = await failedResources(ctx, ref);
	return `${ref.name} is ${status}. ${
		failed.length === 0
			? "CloudFormation names no failed resource."
			: `Failed: ${failed.map((one) => (one.reason ? `${one.id} (${one.reason})` : one.id)).join("; ")}.`
	}`;
}

/**
 * Explains a deploy that failed by what it left the stack in, waiting out a
 * rollback still running and the ECS services it rolled back. Returns the
 * error the step fails with.
 */
export async function explainFailure(
	ctx: Pick<Ctx, "sh" | "update">,
	ref: StackRef,
	cause: unknown,
): Promise<Error> {
	const status = await settle(ctx, ref);
	const why = cause instanceof Error ? cause.message : String(cause);
	if (status === "UPDATE_ROLLBACK_FAILED") {
		const stuck = await failedResources(ctx, ref);
		ctx.update(`${ref.name}'s rollback failed`);
		return new Error(
			`${ref.name}'s deploy failed and its rollback failed too, so the stack refuses deploys until the rollback is continued. ${describeStuck(stuck)} Fix what blocks those resources, then retry this step: it asks before continuing the rollback.`,
			{ cause },
		);
	}
	const services = await watchServices(ctx, ref);
	const health = describeServices(services);
	if (status === "UPDATE_ROLLBACK_COMPLETE") {
		ctx.update(`${ref.name} rolled back`);
		return new Error(
			`${ref.name}'s deploy failed and CloudFormation rolled the stack back to its previous version. ${health}Retry this step to deploy again.`,
			{ cause },
		);
	}
	if (status === "UPDATE_FAILED") {
		ctx.update(`${ref.name}'s deploy paused`);
		return new Error(
			`${ref.name}'s deploy failed and is paused in place (--no-rollback). ${health}Retry this step to deploy again.`,
			{ cause },
		);
	}
	if (status === "ROLLBACK_COMPLETE") {
		ctx.update(`${ref.name} rolled back`);
		return new Error(
			`${ref.name}'s first deploy failed and CloudFormation removed what it made. Retry this step to create it again.`,
			{ cause },
		);
	}
	if (status === "ROLLBACK_FAILED") {
		const stuck = await failedResources(ctx, ref);
		ctx.update(`${ref.name}'s rollback failed`);
		return new Error(
			`${ref.name}'s first deploy failed and so did removing what it made. ${describeStuck(stuck)} Delete the stack by hand, then retry this step.`,
			{ cause },
		);
	}
	if (status?.endsWith("_IN_PROGRESS")) {
		return new Error(
			`${ref.name}'s deploy failed and the stack is still ${status} after ${(POLLS * POLL_SECONDS) / 60} minutes. Retry this step once it settles.`,
			{ cause },
		);
	}
	return cause instanceof Error ? cause : new Error(why);
}

/**
 * Before a deploy, continues a rollback that failed, once the user confirms
 * it, and waits for it to finish. A No, or a rollback that fails again,
 * fails the step with the resources still stuck.
 */
export async function recoverStuck(
	ctx: Pick<Ctx, "sh" | "update" | "confirm">,
	ref: StackRef,
): Promise<void> {
	if ((await stackStatus(ctx, ref)) !== "UPDATE_ROLLBACK_FAILED") {
		return;
	}
	const stuck = await failedResources(ctx, ref);
	const question = `${ref.name}'s last rollback failed, which blocks deploys. ${describeStuck(stuck)} Continue the rollback now?`;
	if (!(await ctx.confirm(question))) {
		throw new Error(
			`Not deploying ${ref.name}: its last rollback failed and was not continued. ${describeStuck(stuck)}`,
		);
	}
	ctx.update(`Continuing ${ref.name}'s rollback`);
	await ctx.sh(
		`${aws(ref, "cloudformation continue-update-rollback")} --stack-name ${quoteWord(ref.cfnName)} 2>&1`,
	);
	const status = await settle(ctx, ref);
	if (status !== "UPDATE_ROLLBACK_COMPLETE") {
		const still = await failedResources(ctx, ref);
		throw new Error(
			`${ref.name}'s continued rollback ended in ${status ?? "an unknown state"}. ${describeStuck(still)} Fix what blocks those resources, then retry this step.`,
		);
	}
	ctx.update(`${ref.name} rolled back`);
}

/**
 * Rolls a stack a `--no-rollback` deploy left in `UPDATE_FAILED` back to its
 * previous template and waits for it to finish. Any other status is left
 * alone. Fails with the resources still stuck when the rollback does not
 * reach `UPDATE_ROLLBACK_COMPLETE`.
 */
export async function rollbackPaused(
	ctx: Pick<Ctx, "sh" | "update">,
	ref: StackRef,
): Promise<boolean> {
	if ((await stackStatus(ctx, ref)) !== "UPDATE_FAILED") {
		return false;
	}
	ctx.update(`Rolling back ${ref.name}`);
	await ctx.sh(
		`${aws(ref, "cloudformation rollback-stack")} --stack-name ${quoteWord(ref.cfnName)} 2>&1`,
	);
	const status = await settle(ctx, ref);
	if (status !== "UPDATE_ROLLBACK_COMPLETE") {
		const still = await failedResources(ctx, ref);
		throw new Error(
			`${ref.name}'s rollback ended in ${status ?? "an unknown state"}. ${describeStuck(still)} Fix what blocks those resources, then retry this step.`,
		);
	}
	ctx.update(`${ref.name} rolled back`);
	return true;
}

async function readStackState(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
	wait = 0,
): Promise<
	| {
			readonly ok: true;
			readonly status: string;
			readonly changeSetId?: string;
	  }
	| { readonly ok: false; readonly raw: string }
> {
	const raw = (
		await ctx.sh(
			`${wait ? `sleep ${wait}; ` : ""}${aws(ref, "cloudformation describe-stacks")} --stack-name ${quoteWord(ref.cfnName)} --query 'Stacks[0].[StackStatus,ChangeSetId]' --output text 2>&1 || true`,
		)
	).trim();
	const [read, current] = raw.split(/\s+/);
	const status = read?.match(/^[A-Z]+(?:_[A-Z]+)+$/)?.[0];
	if (!status) {
		return { ok: false, raw };
	}
	return {
		ok: true,
		status,
		changeSetId: current && current !== "None" ? current : undefined,
	};
}

/** The stack's status and last change set ARN, or `undefined` when it has no status. */
export async function stackState(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
	wait = 0,
): Promise<
	{ readonly status: string; readonly changeSetId?: string } | undefined
> {
	const state = await readStackState(ctx, ref, wait);
	return state.ok
		? { status: state.status, changeSetId: state.changeSetId }
		: undefined;
}

/**
 * Waits for the change set `id` to finish running on the stack: until the
 * stack names it as its last change set and is no longer `*_IN_PROGRESS`,
 * showing its latest event. Returns the stack's status then, or the last one
 * read when it is still running after twice the polls a rollback gets.
 * Throws promptly when `describe-stacks` reports a non-transient auth/SSO or
 * missing-stack error, or fails `POLL_FAILURES` times in a row.
 */
export async function awaitChangeSet(
	ctx: Pick<Ctx, "sh" | "update">,
	ref: StackRef,
	id: string,
): Promise<string | undefined> {
	let status: string | undefined;
	let failures = 0;
	for (let poll = 0; poll < POLLS * 2; poll++) {
		const state = await readStackState(ctx, ref, poll ? POLL_SECONDS : 0);
		if (!state.ok) {
			const detail = state.raw ? state.raw.slice(0, 400) : "empty output";
			if (FATAL_AWS_ERROR.test(state.raw)) {
				throw new Error(
					`Could not read ${ref.name}'s status while waiting on its change set: ${detail}`,
				);
			}
			failures++;
			if (failures >= POLL_FAILURES) {
				throw new Error(
					`Could not read ${ref.name}'s status after ${failures} attempts while waiting on its change set: ${detail}`,
				);
			}
			continue;
		}
		failures = 0;
		status = state.status;
		if (state.changeSetId === id && !status.endsWith("_IN_PROGRESS")) {
			return status;
		}
		if (status.endsWith("_IN_PROGRESS")) {
			ctx.update(
				`${ref.name} is ${status.toLowerCase().replaceAll("_", " ")}${await latestEvent(ctx, ref)}`,
			);
		}
	}
	return status;
}

async function latestEvent(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
): Promise<string> {
	const event = (
		await ctx.sh(
			`${aws(ref, "cloudformation describe-stack-events")} --stack-name ${quoteWord(ref.cfnName)} --max-items 1 --query 'StackEvents[0].[LogicalResourceId,ResourceStatus]' --output text 2>&1 || true`,
		)
	)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.join(" ");
	return event ? `: ${event}` : "";
}

/** Waits until the stack is no longer `*_IN_PROGRESS`, showing its latest event. */
async function settle(
	ctx: Pick<Ctx, "sh" | "update">,
	ref: StackRef,
): Promise<string | undefined> {
	let status = await stackStatus(ctx, ref);
	for (let poll = 0; poll < POLLS && status?.endsWith("_IN_PROGRESS"); poll++) {
		const event = (
			await ctx.sh(
				`sleep ${POLL_SECONDS}; ${aws(ref, "cloudformation describe-stack-events")} --stack-name ${quoteWord(ref.cfnName)} --max-items 1 --query 'StackEvents[0].[LogicalResourceId,ResourceStatus]' --output text 2>&1 || true`,
			)
		)
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.join(" ");
		ctx.update(
			`${ref.name} is ${status.toLowerCase().replaceAll("_", " ")}${event ? `: ${event}` : ""}`,
		);
		status = await stackStatus(ctx, ref);
	}
	return status;
}

/** A resource a failed rollback left stuck, with CloudFormation's reason. */
export interface Stuck {
	readonly id: string;
	readonly reason: string;
}

async function failedResources(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
): Promise<Stuck[]> {
	const out = await ctx.sh(
		`${aws(ref, "cloudformation describe-stack-resources")} --stack-name ${quoteWord(ref.cfnName)} --query "StackResources[?ends_with(ResourceStatus, 'FAILED')].[LogicalResourceId,ResourceStatusReason]" --output text 2>&1 || true`,
	);
	return out
		.split("\n")
		.map((line) => line.split("\t"))
		.filter((parts) => parts.length >= 2 && parts[0])
		.map(([id, ...reason]) => ({
			id: id ?? "",
			reason: reason.join(" ").trim(),
		}));
}

function describeStuck(stuck: readonly Stuck[]): string {
	return stuck.length === 0
		? "CloudFormation names no failed resource."
		: `Stuck: ${stuck.map((one) => (one.reason ? `${one.id} (${one.reason})` : one.id)).join("; ")}.`;
}

/** Where an ECS service in the stack ended up. */
export interface ServiceState {
	readonly name: string;
	/** Its rollout finished with every task it wants running. */
	readonly healthy: boolean;
	readonly running: number;
	readonly desired: number;
}

/**
 * Waits for each ECS service in the stack to finish rolling out, which after
 * a failed deploy is the circuit breaker's rollback, and reads where it
 * ended up.
 */
async function watchServices(
	ctx: Pick<Ctx, "sh" | "update">,
	ref: StackRef,
): Promise<ServiceState[]> {
	const arns = (
		await ctx.sh(
			`${aws(ref, "cloudformation describe-stack-resources")} --stack-name ${quoteWord(ref.cfnName)} --query "StackResources[?ResourceType=='AWS::ECS::Service'].PhysicalResourceId" --output text 2>&1 || true`,
		)
	)
		.split(/\s+/)
		.filter((arn) => arn.startsWith("arn:aws:ecs:"));
	const states: ServiceState[] = [];
	for (const arn of arns) {
		// arn:aws:ecs:<region>:<account>:service/<cluster>/<service>
		const [, cluster = "", name = arn] =
			arn.split(":").at(-1)?.split("/") ?? [];
		let state = await readService(ctx, ref, { cluster, arn, name });
		for (let poll = 0; poll < POLLS && state.rolling; poll++) {
			ctx.update(
				`${ref.name}: ${name} is rolling out, ${state.running}/${state.desired} tasks`,
			);
			state = await readService(ctx, ref, {
				cluster,
				arn,
				name,
				wait: POLL_SECONDS,
			});
		}
		states.push(state);
	}
	return states;
}

async function readService(
	ctx: Pick<Ctx, "sh">,
	ref: StackRef,
	service: { cluster: string; arn: string; name: string; wait?: number },
): Promise<ServiceState & { rolling: boolean }> {
	const { cluster, arn, name, wait = 0 } = service;
	const out = await ctx.sh(
		`${wait ? `sleep ${wait}; ` : ""}${aws(ref, "ecs describe-services")} --cluster ${cluster} --services ${arn} --query 'services[0].deployments[].[status,rolloutState,runningCount,desiredCount]' --output text 2>&1 || true`,
	);
	const rows = out
		.split("\n")
		.map((line) => line.trim().split(/\s+/))
		.filter((parts) => parts.length === 4);
	const primary = rows.find(([status]) => status === "PRIMARY");
	const running = Number(primary?.[2] ?? 0);
	const desired = Number(primary?.[3] ?? 0);
	return {
		name,
		rolling: rows.some(([, rollout]) => rollout === "IN_PROGRESS"),
		healthy:
			rows.length === 1 && primary?.[1] === "COMPLETED" && running >= desired,
		running,
		desired,
	};
}

function describeServices(services: readonly ServiceState[]): string {
	if (services.length === 0) {
		return "";
	}
	const sick = services.filter((service) => !service.healthy);
	return sick.length === 0
		? `Its services are healthy (${services.map((service) => service.name).join(", ")}). `
		: `Not healthy: ${sick.map((service) => `${service.name} (${service.running}/${service.desired} tasks)`).join(", ")}. `;
}

function aws(ref: StackRef, verb: string): string {
	return `aws ${verb}${ref.profile ? ` --profile ${quoteWord(ref.profile)}` : ""}`;
}

function quoteWord(word: string): string {
	return /^[\w@%+=:,./-]+$/.test(word)
		? word
		: `'${word.replaceAll("'", `'\\''`)}'`;
}
