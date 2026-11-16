import type { Fs } from "core/system";
import { manifestAt } from "../bundle/reach";
import type { Package } from "../workspace/workspace";
import { FIELDS, type Json } from "./source-manifest";

export const NEVER = ["scry", "vet"];

/**
 * Refuses a package that needs what the mirror cannot hold. A public
 * package of another project is no obstacle: the mirror depends on its
 * published build instead, and its name is returned.
 */
export async function checkDependencies(
	fs: Fs,
	own: readonly Package[],
	sources: readonly string[],
	all: readonly Package[],
): Promise<Map<string, string>> {
	const names = new Set(own.map((pkg) => pkg.name));
	const published = new Map<string, string>();
	for (const pkg of own) {
		const manifest = (await manifestAt(fs, pkg.dir)) as Json;
		for (const field of FIELDS) {
			for (const [name, range] of Object.entries(manifest[field] ?? {})) {
				if (NEVER.includes(name)) {
					throw new Error(
						`${pkg.name} depends on ${name}, which is never copied out of the repository`,
					);
				}
				if (
					range.startsWith("workspace:") &&
					!sources.includes(name) &&
					!names.has(name)
				) {
					const other = all.find((one) => one.name === name);
					if (other === undefined || other.private) {
						throw new Error(
							`${pkg.name} depends on ${name}, which the mirror would not hold`,
						);
					}
					published.set(name, other.dir);
				}
			}
		}
	}
	return published;
}
