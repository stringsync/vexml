import { run } from './run';

// Build the site/ playground and publish it to the gh-pages branch.
// Pages must be set to "Deploy from a branch → gh-pages" in repo settings.
// gh-pages force-pushes site/dist as an orphan branch; bunx fetches it on demand.
export async function deploy() {
	await run('bunx', ['vite', 'build', 'site']);
	await run('bunx', ['gh-pages', '-d', 'site/dist']);
}
