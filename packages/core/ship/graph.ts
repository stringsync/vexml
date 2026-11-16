/**
 * Checks that every node names only nodes in the list as its dependencies,
 * and that following them never comes back round, throwing on the first
 * fault. `what` names the nodes in the message ("step", "target").
 */
export function checkGraph(
	nodes: readonly { id: string; dependencies?: readonly string[] }[],
	what: string,
): void {
	const byId = new Map<string, readonly string[]>();
	for (const node of nodes) {
		if (byId.has(node.id)) {
			throw new Error(`Two ${what}s are named "${node.id}"`);
		}
		byId.set(node.id, node.dependencies ?? []);
	}
	for (const [id, dependencies] of byId) {
		for (const dependency of dependencies) {
			if (!byId.has(dependency)) {
				throw new Error(
					`The ${what} "${id}" depends on "${dependency}", which is not one of them`,
				);
			}
		}
	}

	const done = new Set<string>();
	const path: string[] = [];
	const visit = (id: string): void => {
		if (done.has(id)) {
			return;
		}
		const at = path.indexOf(id);
		if (at !== -1) {
			const cycle = [...path.slice(at), id]
				.map((node) => `"${node}"`)
				.join(" -> ");
			throw new Error(`The ${what}s depend on each other in a cycle: ${cycle}`);
		}
		path.push(id);
		for (const dependency of byId.get(id) ?? []) {
			visit(dependency);
		}
		path.pop();
		done.add(id);
	};
	for (const id of byId.keys()) {
		visit(id);
	}
}
