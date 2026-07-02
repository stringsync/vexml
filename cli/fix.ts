import { run } from './run';

export async function fix({ check }: { check: boolean }) {
	await run('bunx', [
		'biome',
		'check',
		...(check ? [] : ['--write', '--unsafe']),
		'.',
	]);
	await run('bunx', ['tsc', '--noEmit']);
	console.log('tsc: Compilation successful.');
	// Validate all .musicxml fixtures against the MusicXML XSD.
	await run('./xmllint/validate.sh', []);
}
