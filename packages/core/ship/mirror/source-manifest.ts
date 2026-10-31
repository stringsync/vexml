import type { Fs } from "core/system";
import type { Manifest } from "../bundle/published";
import { entries, manifestAt, outsider, specifiers } from "../bundle/reach";
import type { Package } from "../workspace/workspace";

/** A manifest as far as the mirror writes one. */
export type Json = Manifest & {
	peerDependenciesMeta?: Record<string, object>;
	devDependencies?: Record<string, string>;
};

/** The manifest fields a mirror reads dependencies from. */
export const FIELDS = [
	"dependencies",
	"peerDependencies",
	"devDependencies",
] as const;

/** What the source package's manifest in a mirror is cut down to. */
export interface SourceManifestOptions {
	/** The export keys the mirrored project reaches. */
	keys: ReadonlySet<string>;
	/** The source files the mirror copies. */
	files: ReadonlySet<string>;
	/** The workspace's catalog, which `catalog:` ranges are read from. */
	catalog: Record<string, string>;
	/** The version the release goes out at. */
	version: string;
}

/**
 * The mirrored source package's manifest: only the entry points reached, and
 * the dependencies and optional peers those files import, at the ranges the
 * package declared with `catalog:` read through the workspace's catalog.
 */
export async function sourceManifest(
	fs: Fs,
	core: Package,
	{ keys, files, catalog, version }: SourceManifestOptions,
): Promise<Json> {
	const manifest = (await manifestAt(fs, core.dir)) as Json;
	const exported = entries(manifest.exports ?? {});
	const out: Json = {
		name: core.name,
		version,
		private: true,
		type: "module",
		exports: Object.fromEntries(
			[...keys].toSorted().map((key) => [key, exported.get(key) as string]),
		),
	};
	if (typeof manifest.license === "string") {
		out.license = manifest.license;
	}
	const needed = new Set<string>();
	for (const file of files) {
		for (const specifier of await specifiers(file, fs)) {
			const outside = outsider(specifier);
			if (outside !== undefined && outside !== core.name) {
				needed.add(outside);
			}
		}
	}
	for (const name of [...needed].toSorted()) {
		const field = FIELDS.find((one) => manifest[one]?.[name] !== undefined);
		if (field === undefined) {
			throw new Error(
				`${core.name} imports ${name}, which it does not declare`,
			);
		}
		const range = manifest[field]?.[name] as string;
		const resolved = range.startsWith("catalog:") ? catalog[name] : range;
		if (resolved === undefined || resolved.startsWith("workspace:")) {
			throw new Error(
				`${core.name} declares ${name} as ${range}, which no registry can resolve`,
			);
		}
		out[field] = { ...out[field], [name]: resolved };
		const meta = manifest.peerDependenciesMeta?.[name];
		if (field === "peerDependencies" && meta !== undefined) {
			out.peerDependenciesMeta = {
				...out.peerDependenciesMeta,
				[name]: meta,
			};
		}
		// No file imports a types package, so it rides along with what it types.
		const types = typesOf(name);
		const typed = manifest.devDependencies?.[types];
		if (typed !== undefined) {
			const resolvedTypes = typed.startsWith("catalog:")
				? catalog[types]
				: typed;
			if (resolvedTypes === undefined) {
				throw new Error(`${types} is ${typed}, which the catalog lacks`);
			}
			out.devDependencies = {
				...out.devDependencies,
				[types]: resolvedTypes,
			};
		}
	}
	return out;
}

/** The DefinitelyTyped package for `name`: `@types/react`, `@types/scope__pkg`. */
function typesOf(name: string): string {
	return `@types/${name.startsWith("@") ? name.slice(1).replace("/", "__") : name}`;
}
