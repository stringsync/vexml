import { dirname, relative } from "node:path";
import type { Fs, Ps } from "core/system";

/** What `MirrorTooling` writes for, and the system it writes with. */
export interface MirrorToolingOptions {
	/** The folder mirrored, which a refusal names. */
	project: string;
	fs: Fs;
	ps: Ps;
}

/**
 * The tool configs at a mirror's root: the workspace root's, with the
 * mirrored folder's own laid over them, since the mirror has no root above it
 * to inherit them from.
 */
export class MirrorTooling {
	constructor(private readonly opts: MirrorToolingOptions) {}

	private get fs(): Fs {
		return this.opts.fs;
	}

	private get ps(): Ps {
		return this.opts.ps;
	}

	/**
	 * Points each tsconfig of `files` that extends the workspace's base at the mirror's
	 * copy of it, at the mirror's root, from wherever the mirror holds it.
	 */
	async tsconfigs(dir: string, files: readonly string[]): Promise<void> {
		for (const path of files) {
			if (!path.endsWith("/tsconfig.json")) {
				continue;
			}
			const base = relative(dirname(path), dir) || ".";
			const before = await this.fs.read(path);
			const after = before.replace(
				/("extends"\s*:\s*")(?:\.\.\/)+(tsconfig\.base\.json")/g,
				`$1${base}/$2`,
			);
			if (after !== before) {
				await this.fs.write(path, after);
			}
		}
	}

	/**
	 * The root's `.gitignore` with its patterns rooted in the mirror, then the
	 * project's own: a path under the mirrored folder loses that prefix and one
	 * under any other folder is dropped. What the workspace ignores, such as a
	 * build's output an install writes, stays out of the mirror commit and out
	 * of a clone's tree.
	 */
	async gitignore(root: string, mirror: string): Promise<void> {
		const own = `${mirror}/.gitignore`;
		const base = (await this.fs.exists(`${root}/.gitignore`))
			? (await this.fs.read(`${root}/.gitignore`))
					.split("\n")
					.flatMap((line) => this.rooted(line))
					.join("\n")
			: "node_modules\ndist\n*.tgz\n";
		const theirs = (await this.fs.exists(own)) ? await this.fs.read(own) : "";
		await this.fs.write(
			own,
			theirs === "" ? base : `${base.trimEnd()}\n\n${theirs}`,
		);
	}

	/** A root `.gitignore` line as the mirror holds it, or nothing for another folder's path. */
	private rooted(line: string): string[] {
		const negated = line.startsWith("!");
		const pattern = (negated ? line.slice(1) : line).replace(/^\//, "");
		const prefix = `${this.opts.project}/`;
		if (pattern.startsWith(prefix)) {
			return [`${negated ? "!" : ""}${pattern.slice(prefix.length)}`];
		}
		const anchored =
			pattern.replace(/\/$/, "").includes("/") &&
			!pattern.startsWith("**/") &&
			!line.trimStart().startsWith("#");
		return anchored ? [] : [line];
	}

	/**
	 * The root's `bunfig.toml` with the project's own after it, so a project's
	 * test preload survives beside the root's install settings. Two files that
	 * set the same table cannot be joined, and are refused.
	 */
	async bunfig(root: string, mirror: string): Promise<void> {
		if (!(await this.fs.exists(`${root}/bunfig.toml`))) {
			return;
		}
		const base = await this.fs.read(`${root}/bunfig.toml`);
		const own = `${mirror}/bunfig.toml`;
		if (!(await this.fs.exists(own))) {
			await this.fs.write(own, base);
			return;
		}
		const mine = await this.fs.read(own);
		const clash = tables(base).filter((table) => tables(mine).includes(table));
		if (clash.length > 0) {
			throw new Error(
				`${this.opts.project} and the root both set [${clash[0]}] in bunfig.toml`,
			);
		}
		await this.fs.write(own, `${base.trimEnd()}\n\n${mine}`);
	}

	/**
	 * The lint config: the root's, with the project's own overrides laid over
	 * it. The copied source is left out of it, since the project's style (its
	 * quotes, say) is not the one that source is written and checked in.
	 */
	async lint(root: string, mirror: string, source: string): Promise<void> {
		if (!(await this.fs.exists(`${root}/biome.json`))) {
			return;
		}
		const base = JSON.parse(await this.fs.read(`${root}/biome.json`));
		if (Array.isArray(base.overrides)) {
			base.overrides = this.overrides(base.overrides);
		}
		const own = `${mirror}/biome.json`;
		let config = base;
		if (await this.fs.exists(own)) {
			const {
				root: _root,
				extends: _extends,
				...rest
			} = JSON.parse(await this.fs.read(own));
			config = merge(base, rest);
		}
		config.files = {
			...config.files,
			includes: [...(config.files?.includes ?? ["**"]), `!${source}`],
		};
		await this.fs.write(own, `${JSON.stringify(config, null, "\t")}\n`);
		await this.format(root, mirror, ["biome.json"]);
	}

	/**
	 * The root's overrides as the mirror sees them: their paths run from the
	 * workspace root, so the mirrored folder's prefix is dropped, and an
	 * override left with no path in the mirror is dropped. Globs that start
	 * with a wildcard match anywhere and stay as they are.
	 */
	private overrides(overrides: readonly unknown[]): unknown[] {
		const prefix = `${this.opts.project}/`;
		const out: unknown[] = [];
		for (const override of overrides) {
			if (!isObject(override) || !Array.isArray(override.includes)) {
				out.push(override);
				continue;
			}
			const includes: string[] = [];
			for (const include of override.includes as string[]) {
				const negated = include.startsWith("!");
				const path = negated ? include.slice(1) : include;
				if (path.startsWith("*")) {
					includes.push(include);
				} else if (path.startsWith(prefix)) {
					includes.push(`${negated ? "!" : ""}${path.slice(prefix.length)}`);
				}
			}
			if (includes.some((include) => !include.startsWith("!"))) {
				out.push({ ...override, includes });
			}
		}
		return out;
	}

	/**
	 * Formats JSON the step wrote, by path relative to `mirror`, with the
	 * root's biome and the mirror's own config, so the mirror passes its own
	 * check. Nothing is formatted where the root has no biome installed.
	 */
	private async format(
		root: string,
		mirror: string,
		paths: readonly string[],
	): Promise<void> {
		const biome = `${root}/node_modules/.bin/biome`;
		if (!(await this.fs.exists(biome))) {
			return;
		}
		const result = await this.ps.spawnCapture(
			[biome, "format", "--write", ...paths],
			{ cwd: mirror },
		);
		if (result.exitCode !== 0) {
			throw new Error(
				`biome format failed in ${mirror}: ${result.stderr.trim()}`,
			);
		}
	}
}

/** `over` laid on `base`: objects merge key by key, anything else is replaced. */
function merge(base: unknown, over: unknown): unknown {
	if (isObject(base) && isObject(over)) {
		const out: Record<string, unknown> = { ...base };
		for (const [key, value] of Object.entries(over)) {
			out[key] = key in base ? merge(base[key], value) : value;
		}
		return out;
	}
	return over;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The table headers a TOML file opens, such as `test` for `[test]`. */
function tables(toml: string): string[] {
	return [...toml.matchAll(/^\s*\[([^\]]+)\]\s*$/gm)].map(
		(match) => match[1] as string,
	);
}
