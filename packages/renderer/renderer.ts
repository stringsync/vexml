/** A PNG's bytes. */
export type Image = Buffer;

/**
 * Configured and inert: render() does the engine's whole job — render the score,
 * capture the pixels, clean up — in one call, holding nothing between calls. What
 * engine does the work (a browser, Docker) is the implementation's business; construct
 * one via the `renderers` factories.
 */
export interface Renderer {
	render(): Promise<Image>;
}

/** What eval hands back: the fn's return value, plus the pixels as they stood AFTER
 * the fn ran — a fn that decorates the score gets its decorations in the image. */
export interface RenderResult<T> {
	image: Image;
	result: T;
}

/**
 * A renderer whose engine keeps a live handle the caller can run code against. C is
 * the engine's context — what it chooses to expose to the fn (vexml: the Score, its
 * container, and the library's render entry).
 *
 * Playwright-style contract (its page.evaluate is the prior art): fn crosses into the
 * render as source text (fn.toString()), so it must be self-contained — no closing
 * over outside variables, no calling other caller-scope functions. Anything it needs
 * rides in through `arg`, which must be structured-cloneable and arrives as fn's
 * second parameter. A closure fails loudly at run time with a ReferenceError naming
 * the missing variable.
 */
export interface EvalRenderer<C> extends Renderer {
	eval<T, A = undefined>(
		fn: (ctx: C, arg: A) => T | Promise<T>,
		arg?: A,
	): Promise<RenderResult<T>>;
}
