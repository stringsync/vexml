/** A manifest, as far as anything here reads it. */
export interface Manifest {
	name?: string;
	version?: string;
	main?: string;
	module?: string;
	types?: string;
	bin?: string | Record<string, string>;
	exports?: Exports;
	scripts?: Record<string, string>;
	files?: string[];
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	[field: string]: unknown;
}

/** What a manifest's `exports` can hold, down to the paths a release rewrites. */
export type Exports = string | { [key: string]: Exports };

/**
 * Fields that describe this repository rather than the package, and so have no
 * business on a registry. Everything else carries over untouched, so a manifest
 * gaining a `keywords` or a `funding` needs no changes here.
 */
const LOCAL = new Set([
	"devDependencies",
	"scripts",
	"files",
	"private",
	"workspaces",
	"trustedDependencies",
	// Superseded below by entry points pointing at the built output.
	"main",
	"module",
	"types",
	"exports",
	"bin",
]);

/** A dependency on a sibling, which the registry has under a real version. */
const WORKSPACE = /^workspace:/;

/** A dependency whose range the workspace's catalog gives. */
const CATALOG = /^catalog:/;

/** The source file an entry point names, and what the build makes of it. */
const SOURCE = /\.tsx?$/;

/**
 * The manifest a package publishes, made from the one it is developed under.
 *
 * The two differ because they describe different trees. In the repository a
 * package is its source, so its entry points name `.ts` files and its siblings
 * are `workspace:` ranges. What goes out is the build, published from `dist`
 * with that directory as its root, so the same entry points name the `.js` and
 * `.d.ts` beside them and the siblings name the version they go out at, and
 * a `catalog:` range names what the catalog gives.
 *
 * Generating it is what keeps the source out of the tarball: nothing has to be
 * described twice, and the manifest a developer reads never has to pretend it
 * is describing a package that has been built.
 */
export function published(
	manifest: Manifest,
	opts: PublishedOptions = {},
): Manifest {
	const version = manifest.version;
	if (version === undefined) {
		throw new Error(
			`${manifest.name ?? "a package"} has no version to publish`,
		);
	}
	const out: Manifest = {};
	for (const [field, value] of Object.entries(manifest)) {
		if (!LOCAL.has(field)) {
			out[field] = value;
		}
	}
	const main = built(entry(manifest.exports, ".") ?? manifest.module);
	if (main !== undefined) {
		out.main = main;
		out.types = types(main);
	}
	if (manifest.exports !== undefined) {
		out.exports = conditions(manifest.exports);
	}
	if (manifest.bin !== undefined) {
		out.bin =
			typeof manifest.bin === "string"
				? (built(manifest.bin) ?? manifest.bin)
				: Object.fromEntries(
						Object.entries(manifest.bin).map(([name, path]) => [
							name,
							built(path) ?? path,
						]),
					);
	}
	for (const field of ["dependencies", "peerDependencies"] as const) {
		const deps = manifest[field];
		if (deps !== undefined) {
			out[field] = ranges(manifest.name, deps, version, opts);
		}
	}
	return out;
}

/** What a published manifest's dependency ranges are resolved against. */
export interface PublishedOptions {
	/**
	 * Each workspace sibling's own version, by name: a sibling of another
	 * project goes out at its version, not this one's. A sibling missing here
	 * takes the version going out.
	 */
	versions?: Readonly<Record<string, string>>;
	/** The workspace's catalog, which every `catalog:` range is read from. */
	catalog?: Readonly<Record<string, string>>;
}

/**
 * `exports` with every source path replaced by the pair a consumer resolves
 * through: the declarations for a compiler, and the JavaScript for everyone
 * else. `types` leads because resolution takes the first condition that
 * matches, and a compiler matches `default` too.
 */
function conditions(exports: Exports): Exports {
	if (typeof exports === "string") {
		const main = built(exports);
		return main === undefined ? exports : { types: types(main), default: main };
	}
	return Object.fromEntries(
		Object.entries(exports).map(([key, value]) => [key, conditions(value)]),
	);
}

/** What the build writes for a source path, or nothing if it writes nothing. */
function built(path: string | undefined): string | undefined {
	return path !== undefined && SOURCE.test(path)
		? path.replace(SOURCE, ".js")
		: undefined;
}

/** The declarations beside a built entry point. */
function types(path: string): string {
	return path.replace(/\.js$/, ".d.ts");
}

/** The path an `exports` subpath resolves to, ignoring any conditions on it. */
function entry(exports: Exports | undefined, key: string): string | undefined {
	if (exports === undefined) {
		return undefined;
	}
	if (typeof exports === "string") {
		// A bare string is the whole package, so it answers for "." and nothing else.
		return key === "." ? exports : undefined;
	}
	const found = exports[key];
	return typeof found === "string" ? found : undefined;
}

/**
 * Dependencies with every `workspace:` range replaced by the version going
 * out. A release moves the whole workspace at once, so that version is this
 * package's own, and a caret is what lets a consumer holding two of these
 * install one copy of what they share rather than one copy each.
 */
function ranges(
	name: string | undefined,
	deps: Record<string, string>,
	version: string,
	opts: PublishedOptions,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(deps).map(([dep, range]) => {
			if (WORKSPACE.test(range)) {
				return [dep, `^${opts.versions?.[dep] ?? version}`];
			}
			if (CATALOG.test(range)) {
				const given = opts.catalog?.[dep];
				if (given === undefined) {
					throw new Error(
						`${name ?? "a package"} takes ${dep} from the catalog, which has no ${dep}`,
					);
				}
				return [dep, given];
			}
			return [dep, range];
		}),
	);
}
