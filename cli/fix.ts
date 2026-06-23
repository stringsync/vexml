import { $ } from 'bun';

export async function fix({ check }: { check: boolean }) {
	await $`bunx biome check ${check ? [] : ['--write']} .`;
	await $`bunx tsc --noEmit`;
}
