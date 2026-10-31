import type { Resource } from "core/disposable";
import { type DependencyList, useRef, useState } from "react";
import { useDisposerEffect } from "./use-disposer-effect";

/**
 * Owns a disposable for the lifetime of a single mount. The factory builds the
 * resource; it is disposed when the component unmounts or when one of `deps`
 * changes (compared with `Object.is`, as `useMemo` does), at which point a
 * fresh instance is built. List every value the factory reads from render
 * scope, so an inline arrow keeps its instance across renders:
 *
 *     const feed = useResource(() => new FeedController(source), [source]);
 *
 * Pass a factory, not a prebuilt instance: a factory is what lets the hook
 * rebuild rather than hand back one it has already disposed. The instance is
 * built during render, so a dependent resource built later in the same render
 * reads the rebuilt one straight away.
 *
 * REQUIREMENT: the factory and the disposable's constructor must be
 * render-pure. They may wire up in-memory state and pure helper objects, but
 * must not acquire resources that need cleanup (timers, event or DOM
 * subscriptions, workers, audio nodes, network, global mutation). Because
 * construction happens at render, a render React abandons before commit (an
 * interrupted concurrent render, a throw elsewhere in the tree) builds an
 * instance whose disposing effect never runs, and anything acquired there
 * leaks. Acquire such resources after commit, via `useDisposerEffect`.
 */
export function useResource<T extends Resource>(
	factory: () => T,
	deps: DependencyList,
): T {
	// Building in the effect instead and swapping the instance in afterwards
	// would return a one-render-stale instance after a dependency change, so a
	// downstream resource gets wired against the previous (disposed) upstream
	// during the rebuild cascade. Hence construction at render.
	const [generation, setGeneration] = useState(0);

	// Instances disposed by a prior effect cleanup. Checked below so a disposed
	// instance is never handed back, even for a single committed render: React
	// can reuse this fiber's hook state across an unmount/remount (route
	// prefetch, offscreen) and the preserved memo would return the dead one.
	const retiredRef = useRef<WeakSet<Resource>>(new WeakSet());

	// A manual ref memo rather than useMemo, so the instance is never
	// spuriously recomputed: it is rebuilt only when a dep changes, the
	// generation bumps, or the memoized instance has been retired.
	const memo = useRef<{
		deps: DependencyList;
		generation: number;
		instance: T;
	} | null>(null);
	if (
		memo.current === null ||
		!sameDeps(memo.current.deps, deps) ||
		memo.current.generation !== generation ||
		retiredRef.current.has(memo.current.instance)
	) {
		memo.current = { deps, generation, instance: factory() };
	}
	const instance = memo.current.instance;

	useDisposerEffect(
		(disposer) => {
			if (retiredRef.current.has(instance)) {
				// The effect re-attached onto an instance a prior run already
				// disposed, with no intervening render to rebuild it (StrictMode
				// effect replay, some remount shapes). Bump the generation to
				// force a render so the memo rebuilds, rather than re-adopting
				// the dead instance.
				setGeneration((generation) => generation + 1);
				return;
			}
			disposer.use(instance);
			disposer.defer(() => retiredRef.current.add(instance));
		},
		[instance],
	);

	return instance;
}

function sameDeps(previous: DependencyList, next: DependencyList): boolean {
	return (
		previous.length === next.length &&
		previous.every((dep, index) => Object.is(dep, next[index]))
	);
}
