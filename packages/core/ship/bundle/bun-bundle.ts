import {
	type Fs,
	type Glob,
	NodeFs,
	NodeGlob,
	NodePs,
	type Ps,
	walk,
} from "core/system";
import { ManifestWorkspace } from "../workspace/manifest-workspace";
import type { Bundle } from "./bundle";
import {
	type Exports,
	type Manifest,
	type PublishedOptions,
	published,
} from "./published";
import { catalogAt, manifestAt } from "./reach";

/**
 * Relative specifiers in an emitted declaration, whether imported or exported,
 * and the `import("./x")` form a inferred type can carry.
 */
const SPECIFIER = /(from\s*"|import\(")(\.[^"]*)(")/g;

/** A specifier that already names a file, which is left alone. */
const EXTENSION = /\.[a-z]+$/;

/** A source file an entry point can name. */
const SOURCE = /\.tsx?$/;

/**
 * The documents npm would have taken from a package root on its own. They are
 * copied because the root that publishes is `dist`, which nobody writes into.
 */
const DOCS = ["README.md", "LICENSE", "LICENSE.md", "CHANGELOG.md"];

/** What a `BunBundle` builds through; the real system by default. */
export interface BunBundleOptions {
	fs?: Fs;
	ps?: Ps;
	glob?: Glob;
}

/**
 * Builds a package into `dist/`: one bundle per entry point, the declarations
 * beside them, and a manifest of its own, so that directory is a whole package
 * and the one thing a release sends. What goes out is JavaScript, so a consumer
 * needs neither Bun nor a bundler nor a compiler pass over somebody else's
 * source, and the source never leaves the repository.
 *
 * A package needing something made before it compiles says so with a `build`
 * script in its manifest, and that runs first: `arbor` builds the page it
 * serves, which its own source then imports. The compiler still runs after,
 * because what a package makes for itself is its business and what it publishes
 * as is the release's.
 *
 * A package that reads files of its own at runtime lists them in its
 * manifest's `files`, as globs from its root, and they are copied into `dist`
 * where they sit in the source. The build inlines what is imported, but a file
 * read off disk is invisible to it, and would otherwise be missing only once
 * published.
 */
export class BunBundle implements Bundle {
	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly glob: Glob;

	constructor(opts: BunBundleOptions = {}) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.glob = opts.glob ?? new NodeGlob();
	}

	async build(dir: string): Promise<string> {
		const manifest: Manifest = JSON.parse(
			await this.fs.read(`${dir}/package.json`),
		);
		const out = `${dir}/dist`;
		if (manifest.scripts?.build !== undefined) {
			await this.run(["bun", "run", "build"], dir);
		}
		await this.compile(dir, sources(manifest));
		// Before pointing, since a package that exports nothing built nothing, and
		// walking a directory that is not there is an error rather than a no-op.
		await this.fs.mkdir(out);
		await this.point(dir);
		await this.fs.write(
			`${out}/package.json`,
			`${JSON.stringify(published(manifest, await this.resolving(dir, manifest)), null, "\t")}\n`,
		);
		for (const doc of DOCS) {
			if (await this.fs.exists(`${dir}/${doc}`)) {
				await this.fs.write(
					`${out}/${doc}`,
					await this.fs.read(`${dir}/${doc}`),
				);
			}
		}
		await this.copy(dir, manifest.files ?? []);
		return out;
	}

	/**
	 * What the published manifest's `workspace:` and `catalog:` ranges resolve
	 * against: each sibling's own version and the root catalog, read only for a
	 * package that has such a range.
	 */
	private async resolving(
		dir: string,
		manifest: Manifest,
	): Promise<PublishedOptions> {
		const ranges = Object.values({
			...manifest.dependencies,
			...manifest.peerDependencies,
		});
		if (!ranges.some((range) => /^(workspace|catalog):/.test(range))) {
			return {};
		}
		const workspace = await ManifestWorkspace.at(dir, {
			fs: this.fs,
			ps: this.ps,
		});
		const versions: Record<string, string> = {};
		for (const pkg of await workspace.packages()) {
			const { version } = await manifestAt(this.fs, pkg.dir);
			if (version !== undefined) {
				versions[pkg.name] = version;
			}
		}
		return { versions, catalog: await catalogAt(this.fs, workspace.root) };
	}

	async clean(dir: string): Promise<void> {
		await this.fs.rm(`${dir}/dist`, { recursive: true, force: true });
	}

	/** Copies every file a `files` glob matches into the same place in `dist`. */
	private async copy(dir: string, patterns: string[]): Promise<void> {
		if (patterns.length === 0) {
			return;
		}
		const out = `${dir}/dist`;
		for await (const path of walk(dir, { fs: this.fs })) {
			if (path.startsWith(`${out}/`)) {
				continue;
			}
			const relative = path.slice(dir.length + 1);
			if (patterns.some((pattern) => this.glob.matches(pattern, relative))) {
				await this.fs.mkdir(`${out}/${relative}`.replace(/\/[^/]*$/, ""));
				await this.fs.writeBytes(
					`${out}/${relative}`,
					await this.fs.readBytes(path),
				);
			}
		}
	}

	/**
	 * The JavaScript and the declarations for every entry point a package has,
	 * written to `outdir`, which is relative to `dir` unless it is absolute.
	 */
	async compile(
		dir: string,
		entries: string[],
		outdir = "dist",
	): Promise<void> {
		if (entries.length === 0) {
			return; // nothing is exported, so there is nothing to compile
		}
		// Splitting is what keeps a package with more than one entry point from
		// carrying two copies of everything they share. Two copies means two
		// classes, and a value built by one failing `instanceof` inside the other.
		await this.run(
			[
				"bun",
				"build",
				...entries,
				"--outdir",
				outdir,
				// Without it, a single entry point in a subdirectory lands at the
				// root of the output instead of where its path says.
				"--root",
				".",
				"--target",
				"node",
				"--packages",
				"external",
				"--splitting",
			],
			dir,
		);
		await this.run(
			[
				"bunx",
				"tsc",
				// tsc refuses files on the command line while a tsconfig.json is in
				// reach, and the workspace one says `noEmit`.
				"--ignoreConfig",
				"--emitDeclarationOnly",
				"--declaration",
				"--outDir",
				outdir,
				// A package whose entry points import each other by its own name
				// rather than by relative path needs this: resolving that name goes
				// through the export map, and tsc will not pick a project root to
				// resolve one against on its own (TS2209).
				"--rootDir",
				".",
				"--module",
				"preserve",
				"--moduleResolution",
				"bundler",
				"--target",
				"esnext",
				"--lib",
				"esnext,dom",
				"--types",
				"bun",
				"--strict",
				"--skipLibCheck",
				...entries,
				...(await this.ambient(dir)),
			],
			dir,
		);
	}

	/**
	 * The declaration files a package keeps at its root, which say what its
	 * non-code imports are. Nothing loads the workspace tsconfig during a build,
	 * so anything ambient has to be handed over by name or tsc will not believe
	 * in it: `rules` imports each rule's markdown, and `md.d.ts` is what says
	 * markdown is a string.
	 */
	private async ambient(dir: string): Promise<string[]> {
		const entries = await this.fs.readdir(dir);
		return entries
			.filter((entry) => entry.endsWith(".d.ts"))
			.map((entry) => `./${entry}`);
	}

	/**
	 * Points every relative specifier in the emitted declarations at a `.js`
	 * file. tsc writes them bare, which a consumer resolving as node16 rejects
	 * outright, and which with `skipLibCheck` on it does not report at all: the
	 * references quietly fail and every export becomes `any`, so the types are
	 * lost without anybody being told. A `.js` specifier resolves to the
	 * declaration beside it under both node16 and bundler resolution, so the one
	 * output serves either.
	 *
	 * This runs over whatever is in `dist`, however it got there, so a package
	 * building itself does not have to remember. A specifier that already names
	 * a file is left alone, which is what makes running it twice harmless.
	 */
	private async point(dir: string): Promise<void> {
		for await (const path of walk(`${dir}/dist`, { fs: this.fs })) {
			if (!path.endsWith(".d.ts")) {
				continue;
			}
			const before = await this.fs.read(path);
			const after = before.replace(
				SPECIFIER,
				(match, head: string, specifier: string, tail: string) =>
					EXTENSION.test(specifier) ? match : `${head}${specifier}.js${tail}`,
			);
			if (after !== before) {
				await this.fs.write(path, after);
			}
		}
	}

	private async run(argv: string[], cwd: string): Promise<void> {
		const { exitCode } = await this.ps.spawn(argv, { cwd });
		if (exitCode !== 0) {
			throw new Error(`\`${argv.join(" ")}\` failed in ${cwd}`);
		}
	}
}

/**
 * The source behind every entry point a manifest has, whether it is exported or
 * installed as a command, which is what the build compiles. The manifest
 * already names them, so nothing needs a second list to fall out of step with.
 */
function sources(manifest: Manifest): string[] {
	const found = new Set<string>();
	const gather = (entry: Exports): void => {
		if (typeof entry === "string") {
			if (SOURCE.test(entry)) {
				found.add(entry);
			}
			return;
		}
		for (const value of Object.values(entry)) {
			gather(value);
		}
	};
	gather(manifest.exports ?? {});
	gather(manifest.bin ?? {});
	return [...found];
}
