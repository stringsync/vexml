/*
 * The browser half of the eval contract, shared by every engine's page: mount()
 * renders and keeps the engine's context; evaluate() rehydrates a caller's fn (it
 * crossed the process boundary as source text, see EvalRenderer) and runs it against
 * that context. The context lives here between the calls, because only cloneable data
 * crosses the boundary. Registered as `evaluate`, not `eval`, because assigning
 * globalThis.eval would clobber the real one.
 */

/** One engine's browser-side page: renders the input and keeps the context evals run against. */
export interface EnginePage<I, C> {
	mount(input: I): Promise<C>;
}

export function registerPage<I, C>(page: EnginePage<I, C>): void {
	let current: C | null = null;
	Object.assign(globalThis, {
		async mount(input: I): Promise<void> {
			current = await page.mount(input);
		},

		async evaluate(input: { fnSrc: string; arg?: unknown }): Promise<unknown> {
			if (!current) {
				throw new Error('evaluate: nothing mounted yet');
			}
			const fn = new Function(`return (${input.fnSrc})`)();
			return await fn(current, input.arg);
		},
	});
}
