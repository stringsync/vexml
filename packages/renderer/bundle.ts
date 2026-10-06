/** Bundle a browser-side entry file and everything it imports into one script to pass
 * in OpenOptions.scripts. Whatever it registers on globalThis is ready by the time
 * open() returns. */
export async function bundle(entrypoint: string): Promise<string> {
	// IIFE, not ESM: an injected classic script executes synchronously, so its globalThis
	// registrations exist before open() returns.
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
