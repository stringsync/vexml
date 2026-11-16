import { parseArgs } from "node:util";
import { NodePs } from "core/system";
import { SHIP_PLAN, SHIP_STATUS } from "./contract";
import { Deploy, type DeployOptions } from "./deploy";
import type { Release } from "./release";
import type { ReleaseOptions } from "./release-options";
import type { Bump } from "./version";
import { ManifestWorkspace } from "./workspace/manifest-workspace";

/** An input advertised by the command's plan. */
export type ShipInput = { label: string } & (
	| { type: "choice"; options: readonly string[]; default: string }
	| { type: "boolean"; default: boolean }
	| { type: "string"; default: string }
);

type InputValue<T extends ShipInput> = T extends { type: "boolean" }
	? boolean
	: T extends { type: "choice"; options: readonly (infer V)[] }
		? V
		: string;

/** Validated values handed to a declaration factory. */
export type ShipValues<T extends Record<string, ShipInput>> = {
	readonly [K in keyof T]: InputValue<T[K]>;
} & { readonly bump: Bump };

export interface ShipCommandOptions<T extends Record<string, ShipInput>> {
	inputs?: T;
	/** JSON output sink; stdout by default. */
	output?: { write(text: string): void };
	/** Project-specific defaults and dependencies for all three operations. */
	release?: ReleaseOptions;
	deploy?: DeployOptions;
}

/**
 * Serves the ship command contract without owning process exit or catching errors.
 * A factory can select artifacts from validated, typed inputs before any operation.
 */
export class ShipCommand<
	T extends Record<string, ShipInput> = Record<never, never>,
> {
	constructor(
		// vet-ignore objects-over-callbacks: a declaration factory maps typed inputs to a ship declaration, rather than performing an injected service operation
		private readonly declaration:
			| Release
			| Deploy
			| ((inputs: ShipValues<T>) => Release | Deploy),
		private readonly options: ShipCommandOptions<T> = {},
	) {}

	async run(argv?: string[]): Promise<void> {
		const ps =
			this.options.deploy?.ps ?? this.options.release?.ps ?? new NodePs();
		const output = this.options.output ?? {
			write: (text: string) => {
				process.stdout.write(text);
			},
		};
		const parsed = parseArgs({
			args: argv ?? ps.args,
			allowPositionals: true,
			strict: true,
			options: {
				yes: { type: "boolean" },
				json: { type: "boolean" },
				"dry-run": { type: "boolean" },
				input: { type: "string", multiple: true },
			},
		});
		const operation = parsed.positionals[0] ?? "run";
		if (
			parsed.positionals.length > 1 ||
			!["plan", "status", "run"].includes(operation)
		) {
			throw new Error("expected plan, status or run");
		}
		if (parsed.values.json && operation === "run") {
			throw new Error("--json requires plan or status");
		}
		if (parsed.values["dry-run"] && operation !== "run") {
			throw new Error("--dry-run requires run");
		}
		if (Object.hasOwn(this.options.inputs ?? {}, "bump")) {
			throw new Error("bump is a built-in input");
		}
		const definitions: Record<string, ShipInput> = {
			bump: {
				type: "choice",
				label: "Version bump",
				options: ["patch", "minor", "major"],
				default: this.options.release?.bump ?? "patch",
			},
			...this.options.inputs,
		};
		const raw: Record<string, unknown> = Object.create(null);
		const legacy = ps.env("SPLATES_SHIP_BUMP");
		if (legacy !== undefined) {
			raw.bump = legacy;
		}
		const encoded = ps.env("SPLATES_SHIP_INPUTS");
		if (encoded !== undefined) {
			const value: unknown = JSON.parse(encoded);
			if (value === null || typeof value !== "object" || Array.isArray(value)) {
				throw new Error("SPLATES_SHIP_INPUTS must be a JSON object");
			}
			Object.assign(raw, value);
		}
		for (const entry of parsed.values.input ?? []) {
			const at = entry.indexOf("=");
			if (at < 1) {
				throw new Error("--input expects name=value");
			}
			const name = entry.slice(0, at);
			const value = entry.slice(at + 1);
			raw[name] =
				definitions[name]?.type === "boolean" ? booleanValue(value) : value;
		}
		for (const name of Object.keys(raw)) {
			if (!Object.hasOwn(definitions, name)) {
				throw new Error(`unknown ship input: ${name}`);
			}
		}
		const values: Record<string, string | boolean> = Object.create(null);
		for (const [name, input] of Object.entries(definitions)) {
			const value = Object.hasOwn(raw, name) ? raw[name] : input.default;
			if (
				typeof value !== (input.type === "boolean" ? "boolean" : "string") ||
				(input.type === "choice" && !input.options.includes(value as string))
			) {
				throw new Error(
					`invalid ship input ${name}: expected ${input.type === "choice" ? input.options.join(" | ") : input.type}`,
				);
			}
			values[name] = value as string | boolean;
		}
		const release =
			typeof this.declaration === "function"
				? this.declaration(values as ShipValues<T>)
				: this.declaration;
		if (release instanceof Deploy) {
			const opts = { ...this.options.deploy, ps };
			if (operation === "plan") {
				const plan = await release.plan(opts);
				output.write(
					`${JSON.stringify(SHIP_PLAN.parse({ ...plan, inputs: Object.entries(this.options.inputs ?? {}).map(([name, input]) => ({ name, ...input })) }))}\n`,
				);
			} else if (operation === "status") {
				output.write(
					`${JSON.stringify(SHIP_STATUS.parse(await release.status(opts)))}\n`,
				);
			} else {
				await release.deploy({
					...opts,
					dryRun: parsed.values["dry-run"] ?? opts.dryRun,
				});
			}
			return;
		}
		const opts = { ...this.options.release, ps, bump: values.bump as Bump };
		if (operation === "plan") {
			const plan = await release.plan(opts);
			const workspace =
				opts.workspace ??
				(await ManifestWorkspace.at(ps.cwd(), {
					fs: opts.fs,
					ps,
					project: opts.project,
				}));
			const status = await workspace.version();
			output.write(
				`${JSON.stringify(SHIP_PLAN.parse({ ...plan, identity: { kind: "version", from: status, to: plan.version }, inputs: Object.entries(definitions).map(([name, input]) => ({ name, ...input })) }))}\n`,
			);
		} else if (operation === "status") {
			const status = await release.status(opts);
			output.write(
				`${JSON.stringify(SHIP_STATUS.parse({ identity: { kind: "version", from: status.version, to: status.version }, artifacts: status.artifacts.map(({ name, deployed }) => ({ name, deployed: deployed ?? null })) }))}\n`,
			);
		} else {
			await release.release({
				...opts,
				approved: parsed.values.yes ?? opts.approved,
				dryRun: parsed.values["dry-run"] ?? opts.dryRun,
			});
		}
	}
}

function booleanValue(value: string): boolean {
	if (value === "true") {
		return true;
	}
	if (value === "false") {
		return false;
	}
	throw new Error("boolean ship inputs must be true or false");
}
