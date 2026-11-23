import { describe, type Group, type OptionValues, type Rig } from "./rig";

/** What `serve` writes to and reads from; the process's own when left out. */
export interface ServeDeps {
	/** Where `describe` prints its JSON. */
	print: (text: string) => void;
	/** The environment `start` reads its ports from. */
	env: Record<string, string | undefined>;
}

function parseOptions(rig: Rig, flags: readonly string[]): OptionValues {
	const options = rig.options ?? [];
	const values: OptionValues = {};
	for (const flag of flags) {
		const match = /^--([^=]+)=(.*)$/s.exec(flag);
		if (!match) {
			throw new Error(`Expected --<option>=<value>, got "${flag}"`);
		}
		const [, name = "", raw = ""] = match;
		const option = options.find((each) => each.name === name);
		if (!option) {
			throw new Error(`${rig.name} has no option "${name}"`);
		}
		if (option.type === "boolean") {
			if (raw !== "true" && raw !== "false") {
				throw new Error(
					`${rig.name}'s ${name} takes true or false, not "${raw}"`,
				);
			}
			values[name] = raw === "true";
		} else if (option.type === "number") {
			const value = Number(raw);
			if (raw.trim() === "" || !Number.isFinite(value)) {
				throw new Error(`${rig.name}'s ${name} takes a number, not "${raw}"`);
			}
			values[name] = value;
		} else if (option.type === "enum") {
			if (!option.values.includes(raw)) {
				throw new Error(
					`${rig.name}'s ${name} takes ${option.values.join(" | ")}, not "${raw}"`,
				);
			}
			values[name] = raw;
		} else {
			values[name] = raw;
		}
	}
	for (const option of options) {
		values[option.name] ??= option.default;
	}
	return values;
}

function portsFrom(rig: Rig, env: ServeDeps["env"]): Record<string, number> {
	const ports: Record<string, number> = {};
	for (const name of rig.ports ?? ["web"]) {
		const key = `PORT_${name.toUpperCase().replaceAll("-", "_")}`;
		const port = Number(env[key]);
		if (!Number.isInteger(port) || port <= 0) {
			throw new Error(
				`${key} is not set to a port: splates passes it to start`,
			);
		}
		ports[name] = port;
	}
	return ports;
}

/**
 * Answers a rig request from the project's CLI (`bin/vex rig`), with `argv`
 * the words after it:
 *
 * - `describe` prints the group as JSON.
 * - `start <rig> [--<option>=<value>...]` runs the rig in the foreground,
 *   with the options it was given over their defaults and the ports from
 *   `PORT_<NAME>` in the environment.
 */
export async function serve(
	groups: Group,
	argv: readonly string[],
	deps: Partial<ServeDeps> = {},
): Promise<void> {
	const print = deps.print ?? ((text: string) => console.log(text));
	const env = deps.env ?? process.env;
	const [verb, name, ...flags] = argv;
	if (verb === "describe") {
		print(JSON.stringify(describe(groups)));
		return;
	}
	if (verb === "start") {
		const rig = groups.rigs.find((each) => each.name === name);
		if (!rig) {
			throw new Error(
				`No rig "${name ?? ""}" in ${groups.name}: ${groups.rigs.map((each) => each.name).join(", ")}`,
			);
		}
		const options = parseOptions(rig, flags);
		const ports = portsFrom(rig, env);
		const main = ports[(rig.ports ?? ["web"])[0] as string] as number;
		await rig.run({ options, ports, port: main });
		return;
	}
	throw new Error(
		"Usage: rig describe | rig start <rig> [--<option>=<value>...]",
	);
}
