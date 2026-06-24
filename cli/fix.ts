import { run } from './run';

export async function fix({ check }: { check: boolean }) {
	await run('bunx', ['biome', 'check', ...(check ? [] : ['--write']), '.']);
	await run('bunx', ['tsc', '--noEmit']);
}
