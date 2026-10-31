import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// The Docker image's Chromium only launches under the playwright version it ships with.
test('playwright is pinned to the version of the Docker image tag', () => {
	const pkg = JSON.parse(
		readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
	);
	const dockerfile = readFileSync(
		new URL('../../Dockerfile', import.meta.url),
		'utf8',
	);
	const image = dockerfile.match(
		/^FROM mcr\.microsoft\.com\/playwright:v([\d.]+)-/m,
	)?.[1];

	expect(pkg.dependencies.playwright).toBe(image);
});
