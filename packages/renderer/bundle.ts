import type { BunPlugin } from 'bun';

/** The made-up origin a bundled module's `import.meta.url` points into: the module's own
 * path on disk under it. PlaywrightBrowser serves it from the filesystem, so a
 * `new URL('./asset', import.meta.url)` in a bundled module (vexml's shipped Bravura)
 * fetches the real file, as it would from a consumer's bundler. */
export const FILE_ORIGIN = 'https://files.vexml.invalid';

/** The URL a rendered page fetches the file at this absolute path from, for config that
 * takes a URL (a notation font's woff2). */
export function fileUrl(path: string): string {
	return `${FILE_ORIGIN}${path}`;
}

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
		plugins: [importMetaUrl],
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

// A classic script cannot mention import.meta at all (a SyntaxError for the whole
// bundle), so each module's is replaced with its path under FILE_ORIGIN.
const importMetaUrl: BunPlugin = {
	name: 'import-meta-url',
	setup(build) {
		build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async ({ path, loader }) => {
			const source = await Bun.file(path).text();
			if (!source.includes('import.meta.url')) {
				return undefined;
			}
			const url = JSON.stringify(fileUrl(path));
			return {
				contents: source.replaceAll('import.meta.url', url),
				loader,
			};
		});
	},
};
