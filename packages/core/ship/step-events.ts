import type { Fs } from "core/system";
import { SystemWallClock, type WallClock } from "core/time";
import type { CheckReport, Step, StepStage } from "./step";

/** Check an event line's `schema` against this before reading the rest of it. */
export const EVENTS_SCHEMA = 1 as const;

/** The states a progress line reports; the vocabulary of `wiz dev ship plan` ids. */
type ProgressState = "start" | "done" | "failed" | "skipped";

/**
 * JSON-lines release progress. No path means no event file; `progress`, when
 * given, also receives one `{"event":"step",...}` line per start, done, failure
 * or skip, for a caller reading the release's own output.
 */
export class StepEvents {
	constructor(
		private readonly path: string | undefined,
		private readonly fs: Fs,
		private readonly clock: WallClock = new SystemWallClock(),
		private readonly progress?: ProgressSink,
	) {}

	async declared({
		id,
		step,
		packages,
		artifact,
	}: StepDeclaration): Promise<void> {
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

	async started({ id, step }: StepDeclaration): Promise<void> {
		this.report(id, "start");
		await this.write({ type: "started", id, name: step.name, at: this.at() });
	}

	/** A package staged for approval, with where to approve it. */
	async staged(
		{ id, step }: StepDeclaration,
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
		declaration: StepDeclaration,
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

	async done({ id, step }: StepDeclaration): Promise<void> {
		this.report(id, "done");
		await this.write({ type: "done", id, name: step.name, at: this.at() });
	}

	/** A step a resumed release found already landed. */
	async skipped({ id, step }: StepDeclaration): Promise<void> {
		this.report(id, "skipped");
		await this.write({ type: "skipped", id, name: step.name, at: this.at() });
	}

	async failed({ id, step }: StepDeclaration, error: unknown): Promise<void> {
		this.report(id, "failed");
		await this.write({
			type: "failed",
			id,
			name: step.name,
			error: error instanceof Error ? error.message : String(error),
			at: this.at(),
		});
	}

	private report(id: string, state: ProgressState): void {
		this.progress?.line(
			JSON.stringify({ event: "step", id, state, at: this.at() }),
		);
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

/** Where progress lines go; the release's own logger in practice. */
export interface ProgressSink {
	line(text: string): void;
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

/** One line in the release event file named by WEBAPPWIZ_SHIP_EVENTS or SPLATES_SHIP_EVENTS. */
export type ReleaseStepEvent =
	| StepDeclaredEvent
	| StepStartedEvent
	| StepStagedEvent
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
export interface StepDeclaration {
	readonly id: string;
	readonly step: Step;
	/** The artifact the step belongs to, when it came from one. */
	readonly artifact?: string;
	/** The workspace packages the step publishes, if any. */
	readonly packages?: readonly string[];
}
