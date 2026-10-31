import { Disposer } from "core/disposable";
import { type DependencyList, useEffect } from "react";

/** A `Disposer` that can take on resources but cannot be disposed by the effect. */
export type AppendOnlyDisposer = Pick<
	Disposer,
	"disposed" | "use" | "adopt" | "defer"
>;

export type DisposerEffectCallback = (disposer: AppendOnlyDisposer) => void;

/**
 * Runs an effect that acquires resources, disposing everything it registered
 * when the effect is torn down.
 */
// scry-ignore objects-over-callbacks: `useEffect` with a disposer threaded through, so the effect function is React's contract rather than one this package invented
export function useDisposerEffect(
	effect: DisposerEffectCallback,
	deps: DependencyList,
): void {
	useEffect(() => {
		const disposer = new Disposer();
		try {
			effect(disposer);
		} catch (error) {
			// React only installs the cleanup below if this function returns, so a
			// throw would strand whatever the callback registered before it.
			disposer.dispose();
			throw error;
		}
		return () => {
			disposer.dispose();
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: deps are forwarded by the caller
	}, deps);
}
