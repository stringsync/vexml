/** Compile a browser-side entry file (plus everything it imports) into a single classic
 * script, ready for OpenOptions.scripts. IIFE, not ESM, so injecting it executes it
 * synchronously and its globalThis registrations exist before open() returns. */
export async function bundle(entrypoint: string): Promise<string> {
	const result = await Bun.build({
		entrypoints: [entrypoint],
		target: 'browser',
		format: 'iife',
	});
	const artifact = result.outputs[0];
	if (!result.success || !artifact) {
		throw new AggregateError(
			result.logs,
			`bundle: failed to build ${entrypoint}`,
		);
	}
	return artifact.text();
}
