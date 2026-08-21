import type { TabPool } from './pool';
import type { EvalRenderer, Image, RenderResult } from './renderer';

/**
 * The browser engines' common spine: render = mount + screenshot on a pooled tab, and
 * eval additionally runs the caller's fn (shipped as source text — see EvalRenderer)
 * between the two, so the image reflects whatever the fn did. Subclasses say which
 * pool their page lives in, what its mount global expects, and (optionally) the
 * viewport each render wants.
 */
export abstract class BrowserRenderer<C> implements EvalRenderer<C> {
	/** The pool whose tabs are loaded with this engine's page. */
	protected abstract pool(): TabPool;

	/** What the page's `mount` global expects — structured-cloneable throughout. May
	 * be a promise. */
	protected abstract mountInput(): unknown;

	/** Per-render viewport, or null to keep the pool's default. */
	protected viewport(): { width: number; height: number } | null {
		return null;
	}

	async render(): Promise<Image> {
		return (await this.run()).image;
	}

	async eval<T, A = undefined>(
		fn: (ctx: C, arg: A) => T | Promise<T>,
		arg?: A,
	): Promise<RenderResult<T>> {
		const { image, result } = await this.run(fn.toString(), arg);
		return { image, result: result as T };
	}

	private async run(
		fnSrc?: string,
		arg?: unknown,
	): Promise<{ image: Image; result: unknown }> {
		return this.pool().withTab(async (tab) => {
			const viewport = this.viewport();
			if (viewport) {
				await tab.resize(viewport.width, viewport.height);
			}
			await tab.call('mount', await this.mountInput());
			const result = fnSrc
				? await tab.call<unknown>('evaluate', { fnSrc, arg })
				: undefined;
			const image = await tab.screenshot('#screenshot');
			return { image, result };
		});
	}
}
