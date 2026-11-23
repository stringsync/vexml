// What npm.release's steps run with `bun`, and the mirror's publish workflow
// runs to build: the work that reads and writes many files.
//
//   bun cli.ts locate <package name>
//   bun cli.ts mirror <package folder> <checkout> <version> [keep glob...] [--omit <json>] [--pins <json>] [--fold <json>] [--package-only]
//   bun cli.ts build <package folder>
//
// Folders are relative to the working directory, mono's root or the mirror's.
import { join } from "node:path";
import { NodeFs } from "core/system";
import { build } from "./build";
import { writeMirror } from "./mirror";

const [command, ...args] = process.argv.slice(2);
const root = process.cwd();

if (command === "locate" && args[0]) {
	console.log(JSON.stringify(await locate(root, args[0])));
} else if (command === "mirror" && args.length >= 3) {
	const flagged = (name: string) => {
		const at = args.indexOf(name);
		return at < 0 ? undefined : JSON.parse(args[at + 1] as string);
	};
	const pins = flagged("--pins");
	const fold = flagged("--fold");
	const omit = flagged("--omit");
	const alone = args.includes("--package-only");
	const rest = args.filter(
		(arg, i) =>
			!["--omit", "--pins", "--fold", "--package-only"].includes(arg) &&
			!["--omit", "--pins", "--fold"].includes(args[i - 1] as string),
	);
	const [pkg, into, version, ...keep] = rest as [string, string, string];
	console.log(
		await writeMirror({
			root,
			package: pkg,
			into,
			version,
			keep,
			...(omit && { omit }),
			...(pins && { pins }),
			...(fold && { fold }),
			...(alone && { scope: "package" as const }),
		}),
	);
} else if (command === "build" && args[0]) {
	console.log(await build({ root, package: args[0] }));
} else {
	console.error(
		"usage: cli.ts locate <name> | mirror <folder> <checkout> <version> [keep...] | build <folder>",
	);
	process.exit(2);
}

/** The folder of mono's package named `name`, and the version it declares. */
async function locate(
	root: string,
	name: string,
): Promise<{ dir: string; version?: string }> {
	const fs = new NodeFs();
	for (const project of await fs.readdir(root)) {
		const packages = join(root, project, "packages");
		if (!(await fs.exists(packages))) {
			continue;
		}
		for (const folder of await fs.readdir(packages)) {
			const path = join(packages, folder, "package.json");
			if (!(await fs.exists(path))) {
				continue;
			}
			const manifest = JSON.parse(await fs.read(path));
			if (manifest.name === name) {
				return {
					dir: `${project}/packages/${folder}`,
					...(manifest.version && { version: manifest.version }),
				};
			}
		}
	}
	throw new Error(`No package of mono is named ${name}`);
}
