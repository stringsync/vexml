import { dirname, relative } from "node:path";
import { type Fs, NodeFs, NodePs, type Ps, walk } from "core/system";
import { ManifestWorkspace } from "../workspace/manifest-workspace";
import type { Workspace } from "../workspace/workspace";
import { BunBundle } from "./bun-bundle";
import type { Bundle } from "./bundle";
import type { Manifest } from "./published";
import {
	catalogAt,
	entries,
	isPackage,
	keyOf,
	manifestAt,
	outsider,
	reach,
	SOURCE,
	SPECIFIER,
	specifiers,
} from "./reach";

/** Packages that stay in the repository however something depends on them. */
const NEVER = ["scry", "vet"];

/** What a `VendorBundle` builds and reads through; the real system by default. */
export interface VendorBundleOptions {
	/** Builds the package itself before its vendored code is added; a `BunBundle` by default. */
	bundle?: BunBundle;
	/** Where the private packages are found; the manifest workspace around the package by default. */
	workspace?: Workspace;
	/** Packages that must not be copied into a published one; scry and its rules by default. */
	never?: readonly string[];
	fs?: Fs;
	ps?: Ps;
}

/**
 * Builds a package the way `BunBundle` does, then folds in the private
 * workspace packages it depends on, so that what goes out installs and runs
 * with none of them on a registry.
 *
 * A dependency is vendored when it is a `workspace:` range on a private
 * package, which is the only kind a registry cannot have. Only the entry
 * points the package reaches are copied, with whatever those reach in turn,
 * into `dist/vendor/<name>`, and every import of the package is rewritten to
 * the copy beside it. What the copy needs from outside the workspace joins the
 * published manifest under the range the vendored package declared, optional
 * peers staying optional peers: they are never bundled.
 */
export class VendorBundle implements Bundle {
	private readonly fs: Fs;
	private readonly ps: Ps;
	private readonly bundle: BunBundle;

	constructor(private readonly opts: VendorBundleOptions = {}) {
		this.fs = opts.fs ?? new NodeFs();
		this.ps = opts.ps ?? new NodePs();
		this.bundle = opts.bundle ?? new BunBundle({ fs: this.fs, ps: this.ps });
	}

	async build(dir: string): Promise<string> {
		const source = await manifestAt(this.fs, dir);
		const workspace =
			this.opts.workspace ??
			(await ManifestWorkspace.at(dir, { fs: this.fs, ps: this.ps }));
		const private_ = (await workspace.packages()).filter((pkg) => pkg.private);
		const vendored = private_.filter((pkg) =>
			source.dependencies?.[pkg.name]?.startsWith("workspace:"),
		);
		const never = this.opts.never ?? NEVER;
		for (const pkg of vendored) {
			if (never.includes(pkg.name)) {
				throw new Error(
					`${source.name} depends on ${pkg.name}, which stays in the repository and cannot be vendored`,
				);
			}
		}
		const out = await this.bundle.build(dir);
		if (vendored.length === 0) {
			return out;
		}
		const catalog = await catalogAt(this.fs, workspace.root);
		const published = await manifestAt(this.fs, out);
		for (const pkg of vendored) {
			delete published.dependencies?.[pkg.name];
			await this.vendor(pkg, out, published, catalog);
		}
		await this.fs.write(
			`${out}/package.json`,
			`${JSON.stringify(published, null, "\t")}\n`,
		);
		return out;
	}

	async clean(dir: string): Promise<void> {
		await this.bundle.clean(dir);
	}

	private async vendor(
		pkg: { name: string; dir: string },
		out: string,
		published: Manifest,
		catalog: Record<string, string>,
	): Promise<void> {
		const manifest = await manifestAt(this.fs, pkg.dir);
		const exported = entries(manifest.exports ?? {});
		const root = `${out}/vendor/${pkg.name}`;
		const names = (path: string) => specifiers(path, this.fs);

		const wanted = new Set<string>();
		for (const path of await this.built(out)) {
			for (const specifier of await names(path)) {
				if (isPackage(specifier, pkg.name)) {
					wanted.add(keyOf(pkg, exported, specifier));
				}
			}
		}
		const reached = (await reach(this.fs, pkg, [...wanted])).keys;
		if (reached.size === 0) {
			return;
		}
		const sources = [...reached].map((key) => exported.get(key) as string);
		await this.bundle.compile(pkg.dir, sources, root);

		const where = new Map(
			[...reached].map((key) => [
				key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`,
				`${root}/${(exported.get(key) as string).replace(SOURCE, ".js")}`,
			]),
		);
		for (const path of await this.built(out)) {
			const before = await this.fs.read(path);
			const after = before.replace(
				SPECIFIER,
				(match, head: string, gap: string, specifier: string) => {
					const target = isPackage(specifier, pkg.name)
						? where.get(specifier)
						: undefined;
					if (target === undefined) {
						return match;
					}
					const next = relative(dirname(path), target);
					return `${head}${gap}"${next.startsWith(".") ? next : `./${next}`}"`;
				},
			);
			if (after !== before) {
				await this.fs.write(path, after);
			}
		}

		const needed = new Set<string>();
		for await (const path of walk(root, { fs: this.fs })) {
			if (!/\.(js|d\.ts)$/.test(path)) {
				continue;
			}
			for (const specifier of await names(path)) {
				const outside = outsider(specifier);
				if (outside !== undefined) {
					needed.add(outside);
				}
			}
		}
		this.declare(pkg.name, manifest, published, catalog, needed);
		for (const doc of ["LICENSE", "LICENSE.md"]) {
			if (await this.fs.exists(`${pkg.dir}/${doc}`)) {
				await this.fs.write(
					`${root}/${doc}`,
					await this.fs.read(`${pkg.dir}/${doc}`),
				);
			}
		}
	}

	/** Every JavaScript and declaration file the build left, vendored copies included. */
	private async built(out: string): Promise<string[]> {
		const found: string[] = [];
		for await (const path of walk(out, { fs: this.fs })) {
			if (/\.(js|d\.ts)$/.test(path)) {
				found.push(path);
			}
		}
		return found.toSorted();
	}

	/**
	 * Adds what the vendored copy imports from outside the workspace to the
	 * manifest going out, under the range its own manifest gave, with `catalog:`
	 * read through the workspace's catalog. A peer stays a peer, and stays
	 * optional when it was.
	 */
	private declare(
		vendored: string,
		manifest: Manifest & { peerDependenciesMeta?: Record<string, object> },
		published: Manifest & { peerDependenciesMeta?: Record<string, object> },
		catalog: Record<string, string>,
		needed: Set<string>,
	): void {
		for (const name of [...needed].toSorted()) {
			if (
				published.dependencies?.[name] !== undefined ||
				published.peerDependencies?.[name] !== undefined
			) {
				continue;
			}
			const field =
				manifest.dependencies?.[name] !== undefined
					? "dependencies"
					: manifest.peerDependencies?.[name] !== undefined
						? "peerDependencies"
						: undefined;
			if (field === undefined) {
				throw new Error(
					`${vendored} imports ${name}, which it does not declare`,
				);
			}
			const range = manifest[field]?.[name] as string;
			const resolved = range.startsWith("catalog:") ? catalog[name] : range;
			if (resolved === undefined || resolved.startsWith("workspace:")) {
				throw new Error(
					`${vendored} declares ${name} as ${range}, which no registry can resolve`,
				);
			}
			published[field] = { ...published[field], [name]: resolved };
			const meta = manifest.peerDependenciesMeta?.[name];
			if (field === "peerDependencies" && meta !== undefined) {
				published.peerDependenciesMeta = {
					...published.peerDependenciesMeta,
					[name]: meta,
				};
			}
		}
	}
}
