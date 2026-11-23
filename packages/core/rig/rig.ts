/**
 * Dev servers a project declares as plain objects, for the splates Rigs page
 * (`splates/docs/rigs.md`). Nothing here starts anything: `rig()` and
 * `group()` only check and return what they are given.
 */

const NAME = /^[a-z][a-z0-9-]*$/;

type Described = { label?: string; description?: string };

/** One typed option a rig starts with, each with its default. */
export type Option =
	| (Described & { name: string; type: "boolean"; default: boolean })
	| (Described & { name: string; type: "string"; default: string })
	| (Described & { name: string; type: "number"; default: number })
	| (Described & {
			name: string;
			type: "enum";
			values: readonly [string, ...string[]];
			default: string;
	  });

/** When a running rig counts as up. */
export type Health = { http: string; port?: string } | { command: string };

/** The value of each option a rig starts with, by option name. */
export type OptionValues = Record<string, boolean | string | number>;

/** What a rig's `run` is handed. */
export interface RigCtx {
	/** Every option, defaults included. */
	options: OptionValues;
	/** The port splates picked for each of the rig's ports, by name. */
	ports: Record<string, number>;
	/** The main port, the first of `ports`. */
	port: number;
}

export interface Rig {
	name: string;
	label: string;
	description?: string;
	/** Ports it listens on, the main one first. `["web"]` when left out. */
	ports?: readonly string[];
	health?: Health;
	options?: readonly Option[];
	/** Runs the dev server in the foreground until the process is stopped. */
	run: (ctx: RigCtx) => Promise<void> | void;
}

export interface Group {
	name: string;
	label?: string;
	rigs: readonly Rig[];
}

function repeated(names: readonly string[]): string | undefined {
	return names.find((name, index) => names.indexOf(name) !== index);
}

function checkName(what: string, name: string): void {
	if (!NAME.test(name)) {
		throw new Error(
			`${what} "${name}" must be lowercase words joined by "-", as dev or mock-api`,
		);
	}
}

/** Declares one dev server, checking its names, ports, health and options. */
export function rig(input: Rig): Rig {
	checkName("A rig's name", input.name);
	if (!input.label) {
		throw new Error(`Rig "${input.name}" needs a label`);
	}
	const ports = input.ports ?? ["web"];
	if (ports.length === 0) {
		throw new Error(`Rig "${input.name}" needs at least one port`);
	}
	for (const port of ports) {
		checkName(`${input.name}'s port`, port);
	}
	const twicePort = repeated(ports);
	if (twicePort !== undefined) {
		throw new Error(`Rig "${input.name}" lists port "${twicePort}" twice`);
	}
	const options = input.options ?? [];
	for (const option of options) {
		checkName(`${input.name}'s option`, option.name);
		if (option.type === "enum" && !option.values.includes(option.default)) {
			throw new Error(
				`${input.name}'s option "${option.name}" defaults to "${option.default}", which is not one of its values`,
			);
		}
	}
	const twiceOption = repeated(options.map((option) => option.name));
	if (twiceOption !== undefined) {
		throw new Error(`Rig "${input.name}" lists option "${twiceOption}" twice`);
	}
	const health = input.health;
	if (health && "http" in health) {
		if (!health.http.startsWith("/")) {
			throw new Error(`${input.name}'s health path must start with "/"`);
		}
		if (health.port !== undefined && !ports.includes(health.port)) {
			throw new Error(
				`${input.name}'s health checks port "${health.port}", which it does not declare`,
			);
		}
	}
	if (health && "command" in health && !health.command) {
		throw new Error(`${input.name}'s health command is empty`);
	}
	return input;
}

/** Declares a group of dev servers, as one rig command describes them. */
export function group(input: Group): Group {
	checkName("A group's name", input.name);
	const twice = repeated(input.rigs.map((each) => each.name));
	if (twice !== undefined) {
		throw new Error(`Group "${input.name}" lists rig "${twice}" twice`);
	}
	return input;
}

/** What `describe` prints: the group as the protocol's JSON, without `run`. */
export function describe(input: Group) {
	return {
		name: input.name,
		...(input.label === undefined ? {} : { label: input.label }),
		rigs: input.rigs.map(({ run: _run, ...rest }) => ({
			...rest,
			ports: rest.ports ?? ["web"],
			options: rest.options ?? [],
		})),
	};
}
