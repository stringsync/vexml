import type { Fs } from "core/system";
import { SystemWallClock, type WallClock } from "core/time";
import { EVENTS_SCHEMA } from "./contract";
import type { Cut } from "./cut";
import type { CheckReport, Step, StepStage } from "./step";

export { EVENTS_SCHEMA };

/** JSON-lines release progress. No path means no event file. */
export class StepEvents {
	constructor(
		private readonly path: string | undefined,
		private readonly fs: Fs,
		private readonly clock: WallClock = new SystemWallClock(),
	) {}

	async ask(
		id: string,
		name: string,
		questionId: string,
		question: string,
		signIn?: SignIn,
		input?: "text",
	): Promise<void> {
		await this.write({
			type: "ask",
			id,
			name,
			questionId,
			question,
			...(signIn === undefined
				? {}
				: {
						link: signIn.link,
						...(signIn.code === undefined ? {} : { code: signIn.code }),
					}),
			...(input === undefined ? {} : { input }),
			at: this.at(),
		});
	}

	async answered(
		id: string,
		name: string,
		questionId: string,
		answer: boolean,
	): Promise<void> {
		await this.write({
			type: "answered",
			id,
			name,
			questionId,
			answer,
			at: this.at(),
		});
	}

	async declared({
		id,
		step,
		packages,
		artifact,
	}: StepDeclaration<never>): Promise<void> {
		await this.write({
			type: "declared",
			id,
			name: step.name,
			stage: step.stage ?? "publish",
			packages: [...(packages ?? [])],
			...(artifact === undefined ? {} : { artifact }),
			deadlineMs: step.deadline.ms,
			at: this.at(),
		});
	}

	/** A request for a task that adopts upstream versions, awaiting an answer. */
	async adopt(
		{ id, step }: StepDeclaration<never>,
		questionId: string,
		request: { versions: Record<string, string>; unmovable: UnmovablePins },
	): Promise<void> {
		await this.write({
			type: "adopt",
			id,
			name: step.name,
			questionId,
			...request,
			at: this.at(),
		});
	}

	async started({ id, step }: StepDeclaration<never>): Promise<void> {
		await this.write({ type: "started", id, name: step.name, at: this.at() });
	}

	/** A package staged for approval, with where to approve it. */
	async staged(
		{ id, step }: StepDeclaration<never>,
		info: { package: string; version: string; stageId: string; url: string },
	): Promise<void> {
		await this.write({
			type: "staged",
			id,
			name: step.name,
			...info,
			at: this.at(),
		});
	}

	async check(
		declaration: StepDeclaration<never>,
		{ passed, status, url }: CheckReport,
	): Promise<void> {
		await this.write({
			type: "check",
			id: declaration.id,
			name: declaration.step.name,
			passed,
			...(status === undefined ? {} : { status }),
			...(url === undefined ? {} : { url }),
			at: this.at(),
		});
	}

	async done({ id, step }: StepDeclaration<never>): Promise<void> {
		await this.write({ type: "done", id, name: step.name, at: this.at() });
	}

	/** A step a resumed release found already landed. */
	async skipped({ id, step }: StepDeclaration<never>): Promise<void> {
		await this.write({ type: "skipped", id, name: step.name, at: this.at() });
	}

	async failed(
		{ id, step }: StepDeclaration<never>,
		error: unknown,
	): Promise<void> {
		await this.write({
			type: "failed",
			id,
			name: step.name,
			error: error instanceof Error ? error.message : String(error),
			at: this.at(),
		});
	}

	private async write(event: Unversioned): Promise<void> {
		if (this.path !== undefined && this.path !== "") {
			await this.fs.append(
				this.path,
				`${JSON.stringify({ schema: EVENTS_SCHEMA, ...event })}\n`,
			);
		}
	}

	private at(): string {
		return new Date(this.clock.now()).toISOString();
	}
}

interface StepEvent {
	readonly schema: typeof EVENTS_SCHEMA;
	readonly id: string;
	readonly name: string;
	readonly at: string;
}

export interface StepDeclaredEvent extends StepEvent {
	readonly type: "declared";
	readonly stage: StepStage;
	readonly packages: string[];
	readonly artifact?: string;
	readonly deadlineMs: number;
}

/** A page to open and the code to enter there, for a question that asks the user to sign in. */
export interface SignIn {
	readonly link: string;
	/** Absent when the sign-in is the page alone, as npm's is. */
	readonly code?: string;
}

/**
 * Asks the user to sign in, resolving `true` once `signal` aborts (the sign-in
 * completed on its own) or they answer yes.
 */
export type SignInAsk = (
	question: string,
	signIn: SignIn,
	signal: AbortSignal,
) => Promise<boolean>;

export interface StepAskEvent extends StepEvent {
	readonly type: "ask";
	readonly questionId: string;
	readonly question: string;
	/** Present only on a sign-in question; the ship continues on its own once the sign-in completes. */
	readonly link?: string;
	readonly code?: string;
	/** Present only on a question answered with text, such as a one-time code. */
	readonly input?: "text";
}

export interface StepAnsweredEvent extends StepEvent {
	readonly type: "answered";
	readonly questionId: string;
	readonly answer: boolean;
}

export interface StepStartedEvent extends StepEvent {
	readonly type: "started";
}

export interface StepStagedEvent extends StepEvent {
	readonly type: "staged";
	readonly package: string;
	readonly version: string;
	readonly stageId: string;
	readonly url: string;
}

export interface StepCheckEvent extends StepEvent {
	readonly type: "check";
	readonly passed: boolean;
	/** What a failed check still waits on, when its step says. */
	readonly status?: string;
	/** Where a person can look into it. */
	readonly url?: string;
}

type UnmovablePins = { name: string; file: string; pin: string }[];

export interface StepAdoptEvent extends StepEvent {
	readonly type: "adopt";
	readonly questionId: string;
	readonly versions: Record<string, string>;
	readonly unmovable: UnmovablePins;
}

export interface StepDoneEvent extends StepEvent {
	readonly type: "done";
}

export interface StepSkippedEvent extends StepEvent {
	readonly type: "skipped";
}

export interface StepFailedEvent extends StepEvent {
	readonly type: "failed";
	readonly error: string;
}

/** One line in the release event file named by SPLATES_SHIP_EVENTS. */
export type ReleaseStepEvent =
	| StepAskEvent
	| StepAnsweredEvent
	| StepDeclaredEvent
	| StepStartedEvent
	| StepStagedEvent
	| StepAdoptEvent
	| StepCheckEvent
	| StepDoneEvent
	| StepSkippedEvent
	| StepFailedEvent;

/** An event as built here, before `write` stamps its schema. */
type Unversioned = ReleaseStepEvent extends infer E
	? E extends ReleaseStepEvent
		? Omit<E, "schema">
		: never
	: never;

/** What a step runner reports, identified independently of its display name. */
export interface StepDeclaration<Context = Cut> {
	readonly id: string;
	readonly step: Step<Context>;
	/** The artifact the step belongs to, when it came from one. */
	readonly artifact?: string;
	/** The workspace packages the step publishes, if any. */
	readonly packages?: readonly string[];
}
