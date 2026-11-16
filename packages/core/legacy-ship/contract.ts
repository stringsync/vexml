import { z } from "zod";

// The one contract every ship speaks, whatever kind it is: its plan
// (`ship plan --json`), status (`ship status --json`), step events
// (`SPLATES_SHIP_EVENTS`) and answers (`SPLATES_SHIP_ANSWERS`). A viewer reads
// any ship through it. Schema 1 grows only by adding fields.

/** A plan's `schema`; check it before reading the rest of a plan. */
export const PLAN_SCHEMA = 1 as const;

/** An event line's `schema`; check it before reading the rest of the line. */
export const EVENTS_SCHEMA = 1 as const;

const TEXT = z.string().trim().min(1);

export const STEP_STAGE = z.enum([
	"preflight",
	"stamp",
	"build",
	"publish",
	"approve",
	"tag",
	"notes",
]);
export type ContractStepStage = z.infer<typeof STEP_STAGE>;

const COMMON_INPUT = { name: z.string().min(1), label: z.string().min(1) };

/** A choice, boolean or text control a ship advertises in its plan. */
export const SHIP_INPUT = z.discriminatedUnion("type", [
	z
		.object({
			...COMMON_INPUT,
			type: z.literal("choice"),
			options: z.array(z.string()).min(1),
			default: z.string(),
		})
		.refine(
			(input) => input.options.includes(input.default),
			"default must be an option",
		),
	z.object({
		...COMMON_INPUT,
		type: z.literal("boolean"),
		default: z.boolean(),
	}),
	z.object({ ...COMMON_INPUT, type: z.literal("string"), default: z.string() }),
]);
export type PlanInput = z.infer<typeof SHIP_INPUT>;

/** What the ship would put out: a version bump, or a commit to deploy. */
export const SHIP_IDENTITY = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("version"), from: TEXT.nullable(), to: TEXT }),
	z.object({ kind: z.literal("commit"), commit: TEXT }),
]);
export type ShipIdentity = z.infer<typeof SHIP_IDENTITY>;

/** One step of a plan; its `id` is the one the step's events carry. */
export const PLAN_STEP = z.looseObject({
	id: TEXT,
	name: z.string(),
	stage: STEP_STAGE,
	packages: z.array(z.string()),
	artifact: z.string().optional(),
	deadlineMs: z.number(),
});
export type PlanStep = z.infer<typeof PLAN_STEP>;

/** A repository-relative literal source path. */
const SOURCE_PATH = TEXT.refine(
	(path) =>
		!path.startsWith("/") &&
		!/^[A-Za-z]:/.test(path) &&
		!path.split("/").includes("..") &&
		!/[\\*?[\]{}]/.test(path),
	"expected a repository-relative literal source path",
);

export const SHIP_PLAN = z.looseObject({
	schema: z.literal(PLAN_SCHEMA),
	identity: SHIP_IDENTITY,
	/** The version a release goes out at; a deploy has none. */
	version: z.string().optional(),
	resuming: z.boolean(),
	paths: z.array(SOURCE_PATH).optional(),
	inputs: z
		.array(SHIP_INPUT)
		.refine(
			(inputs) =>
				new Set(inputs.map((input) => input.name)).size === inputs.length,
			"input names must be unique",
		),
	steps: z.array(PLAN_STEP),
});
export type ShipPlan = z.infer<typeof SHIP_PLAN>;

export const SHIP_STATUS = z
	.looseObject({
		identity: SHIP_IDENTITY,
		artifacts: z.array(z.object({ name: TEXT, deployed: TEXT.nullable() })),
	})
	.refine(
		(value) =>
			new Set(value.artifacts.map((each) => each.name)).size ===
			value.artifacts.length,
		{ message: "artifact names must be unique" },
	);
export type ShipStatus = z.infer<typeof SHIP_STATUS>;

const EVENT = {
	schema: z.literal(EVENTS_SCHEMA),
	id: z.string(),
	name: z.string(),
	at: z.string(),
};

/** One line of the event file named by SPLATES_SHIP_EVENTS. */
export const STEP_EVENT = z.discriminatedUnion("type", [
	z.looseObject({
		...EVENT,
		type: z.literal("declared"),
		stage: STEP_STAGE,
		packages: z.array(z.string()),
		artifact: z.string().optional(),
		deadlineMs: z.number(),
	}),
	z.looseObject({
		...EVENT,
		type: z.literal("ask"),
		questionId: z.string(),
		question: z.string(),
		/** Present only on a sign-in question. */
		link: z.string().optional(),
		code: z.string().optional(),
		/** Present only on a question whose answer is text, such as a one-time code. */
		input: z.literal("text").optional(),
	}),
	z.looseObject({
		...EVENT,
		type: z.literal("answered"),
		questionId: z.string(),
		answer: z.boolean(),
	}),
	z.looseObject({ ...EVENT, type: z.literal("started") }),
	z.looseObject({
		...EVENT,
		type: z.literal("staged"),
		package: z.string(),
		version: z.string(),
		stageId: z.string(),
		url: z.string(),
	}),
	z.looseObject({
		...EVENT,
		type: z.literal("check"),
		passed: z.boolean(),
		status: z.string().optional(),
		url: z.string().optional(),
	}),
	z.looseObject({
		...EVENT,
		type: z.literal("adopt"),
		questionId: z.string(),
		/** Upstream package name to the version to adopt. */
		versions: z.record(z.string(), z.string()),
		/** The pins a step could not simply move, which the task adopts. */
		unmovable: z.array(
			z.object({ name: z.string(), file: z.string(), pin: z.string() }),
		),
	}),
	z.looseObject({ ...EVENT, type: z.literal("done") }),
	z.looseObject({ ...EVENT, type: z.literal("skipped") }),
	z.looseObject({ ...EVENT, type: z.literal("failed"), error: z.string() }),
]);
export type StepEventLine = z.infer<typeof STEP_EVENT>;

/** One line a caller appends to the file named by SPLATES_SHIP_ANSWERS. */
export const SHIP_ANSWER = z.looseObject({
	questionId: z.string(),
	answer: z.boolean(),
	/** The text a text question asked for; absent on a yes or no. */
	text: z.string().optional(),
});
export type ShipAnswer = z.infer<typeof SHIP_ANSWER>;
