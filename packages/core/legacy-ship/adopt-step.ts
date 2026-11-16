import { relative } from "node:path";
import { color } from "core/log";
import { type Fs, NodeFs, NodePs, type Ps } from "core/system";
import { Duration } from "core/time";
import type { ShipInput } from "./command";
import type { Cut } from "./cut";
import type { Step, StepReport } from "./step";
import { ManifestWorkspace } from "./workspace/manifest-workspace";
import type { Workspace } from "./workspace/workspace";

/**
 * The ship input that carries the upstream versions to adopt, as
 * `name@version` entries separated by commas. Declare it in the command's
 * `inputs` and pass its value to `releases.adopt`.
 */
export const ADOPT_INPUT = {
	type: "string",
	label: "Upstream versions to adopt",
	default: "",
} as const satisfies ShipInput;

const FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

/** A pin a step can move: an optional range mark and a plain version. */
const PLAIN = /^([\^~]?)\d[\w.+-]*$/;

/** What `AdoptStep` adopts, in whose manifests, and who it asks. */
export interface AdoptOptions {
	/** The project folder whose manifests move, relative to the workspace root. */
	project: string;
	/** The upstream versions, as `ADOPT_INPUT` carries them; empty adopts nothing. */
	upstream: string;
	/** Where the packages are found; the manifest workspace around the release's root by default. */
	workspace?: Workspace;
	fs?: Fs;
	ps?: Ps;
}

/**
 * Moves a project's pins of other projects' packages to the versions a ship
 * passes in, before the release stamps. It is skipped when the pins already
 * match. The manifests are left changed in the tree, for the release commit to
 * carry; the step never commits. A pin it cannot simply move (a catalog entry,
 * an alias, a tag) is handed out as an `adopt` event, asking whoever drives
 * the ship for a task that does the adoption; the release waits for the answer
 * and then checks the pins match.
 */
export class AdoptStep implements Step {
	readonly name = "Adopt upstream versions";
	readonly deadline = Duration.mins(30);
	readonly stage = "preflight" as const;

	private readonly fs: Fs;
	private readonly ps: Ps;

	constructor(private readonly opts: AdoptOptions) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
	}

	async run(cut: Cut, report?: StepReport): Promise<void> {
		const versions = parseUpstream(this.opts.upstream);
		const found = await this.scan(cut, versions);
		if (found.stale.length === 0 && found.unmovable.length === 0) {
			await report?.skipped?.();
			return;
		}
		for (const move of found.stale) {
			await this.move(cut, move.file, move.edits);
		}
		if (found.unmovable.length === 0) {
			return;
		}
		if (report?.adopt === undefined) {
			throw new Error(
				`cannot move ${found.unmovable.map((one) => `${one.name} in ${one.file}`).join(", ")} by hand, and nobody is listening for a task to adopt it`,
			);
		}
		const adopted = await report.adopt({
			versions: Object.fromEntries(versions),
			unmovable: found.unmovable,
		});
		const after = await this.scan(cut, versions);
		if (!adopted || after.stale.length > 0 || after.unmovable.length > 0) {
			throw new Error("the adoption did not move every pin to its version");
		}
	}

	async dryRun(cut: Cut): Promise<void> {
		const found = await this.scan(cut, parseUpstream(this.opts.upstream));
		for (const move of found.stale) {
			cut.log.info(
				`${color.yellow("would move")} ${move.edits.map((one) => `${one.name} to ${one.version}`).join(", ")} in ${move.file}`,
			);
		}
		if (found.unmovable.length > 0) {
			cut.log.info(
				color.yellow(
					`a release would ask for a task to adopt ${found.unmovable.map((one) => one.name).join(", ")}`,
				),
			);
		}
	}

	private async scan(cut: Cut, versions: Map<string, string>) {
		const stale: Move[] = [];
		const unmovable: UnmovablePin[] = [];
		const workspace =
			this.opts.workspace ??
			(await ManifestWorkspace.at(cut.root, { fs: this.fs, ps: this.ps }));
		const root = workspace.root;
		const own = `${root}/${this.opts.project}`;
		for (const pkg of await workspace.packages()) {
			if (pkg.dir !== own && !pkg.dir.startsWith(`${own}/`)) {
				continue;
			}
			const path = `${pkg.dir}/package.json`;
			const manifest = JSON.parse(await this.fs.read(path)) as Record<
				string,
				Record<string, string> | undefined
			>;
			const edits: Edit[] = [];
			for (const field of FIELDS) {
				for (const [name, version] of versions) {
					const pin = manifest[field]?.[name];
					if (pin === undefined || pin.startsWith("workspace:")) {
						continue;
					}
					const plain = PLAIN.exec(pin);
					if (plain === null) {
						unmovable.push({ name, file: relative(root, path), pin });
					} else if (`${plain[1]}${version}` !== pin) {
						edits.push({ field, name, version: `${plain[1]}${version}` });
					}
				}
			}
			if (edits.length > 0) {
				stale.push({ file: path, edits });
			}
		}
		return { stale, unmovable };
	}

	private async move(cut: Cut, path: string, edits: Edit[]): Promise<void> {
		const text = await this.fs.read(path);
		const manifest = JSON.parse(text) as Record<string, Record<string, string>>;
		for (const edit of edits) {
			(manifest[edit.field] as Record<string, string>)[edit.name] =
				edit.version;
		}
		const indent = /^\n?(\t| +)"/m.exec(text)?.[1] ?? "\t";
		await this.fs.write(
			path,
			`${JSON.stringify(manifest, null, indent)}${text.endsWith("\n") ? "\n" : ""}`,
		);
		cut.log.info(`moved ${edits.map((one) => one.name).join(", ")} in ${path}`);
	}
}

/** A pin the step left to an agent task. */
export interface UnmovablePin {
	name: string;
	/** The manifest holding it, relative to the workspace root. */
	file: string;
	pin: string;
}

/** Reads `name@version, name@version` into a map of package name to version. */
export function parseUpstream(text: string): Map<string, string> {
	const versions = new Map<string, string>();
	for (const entry of text.split(",")) {
		const each = entry.trim();
		if (each === "") {
			continue;
		}
		const at = each.lastIndexOf("@");
		if (at <= 0 || at === each.length - 1) {
			throw new Error(`expected name@version, got ${JSON.stringify(each)}`);
		}
		versions.set(each.slice(0, at), each.slice(at + 1));
	}
	return versions;
}

interface Edit {
	field: (typeof FIELDS)[number];
	name: string;
	version: string;
}

interface Move {
	file: string;
	edits: Edit[];
}
