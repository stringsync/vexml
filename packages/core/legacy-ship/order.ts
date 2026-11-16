import type { Package } from "./workspace/workspace";

/**
 * `packages`, each one after everything it depends on. A release both builds
 * and publishes in this order, for the same reason in both cases: a package
 * cannot be built against a sibling whose `dist` is not there yet, and cannot
 * be installed alongside a sibling the registry has never heard of. Ordering
 * this way is what makes a release that dies partway leave a smaller release
 * rather than a broken one.
 *
 * Everything able to go at once goes together in name order, so the same
 * workspace always gives the same sequence and a failed release resumes into
 * the one it left. Packages that depend on nothing stay near the front, where
 * they read as the foundation they are.
 */
export function order(packages: readonly Package[]): Package[] {
	let remaining = [...packages].sort((left, right) =>
		left.name.localeCompare(right.name),
	);
	// Dependencies on anything outside the workspace are already published, so
	// only siblings can hold a package back.
	const siblings = new Set(remaining.map((pkg) => pkg.name));
	const published = new Set<string>();
	const ordered: Package[] = [];
	while (remaining.length > 0) {
		// ponytail: a scan of what is left per round, which at workspace sizes is
		// free. Build a real adjacency list if one ever gets big enough to notice.
		const ready = remaining.filter((pkg) =>
			pkg.dependencies.every((dep) => !siblings.has(dep) || published.has(dep)),
		);
		if (ready.length === 0) {
			throw new Error(
				`dependency cycle: ${remaining
					.map((pkg) => pkg.name)
					.join(", ")} each wait on another, so no order releases them`,
			);
		}
		for (const pkg of ready) {
			ordered.push(pkg);
			published.add(pkg.name);
		}
		remaining = remaining.filter((pkg) => !published.has(pkg.name));
	}
	return ordered;
}
