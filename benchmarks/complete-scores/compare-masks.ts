import { resolve } from 'node:path';
import { type InkMask, renderers } from '@vexml/renderer';
import { NodeFs, NodePs } from 'webappwiz/system';
import { InkCollisions } from '../../packages/vex/ink-collisions';
import { MeasureSlicer } from '../../packages/vex/measure-slicer';

// Opt-in comparison against the pre-tiling implementation, kept in git rather
// than shipped as a second production capture path. Requires this git revision.
const fs = new NodeFs();
const ps = new NodePs();
const source = await ps.spawnCapture([
	'git',
	'show',
	'ad132953:packages/renderer/svg-ink-masks.ts',
]);
if (source.exitCode !== 0) {
	throw new Error(source.stderr);
}
const legacy = new Bun.Transpiler({ loader: 'ts' })
	.transformSync(source.stdout)
	.replace('export class', 'class');
const samples = [
	['clara-schumann-liebst-du', '11-13'],
	['debussy-mandoline', '35-37'],
	['schubert-erlkonig', '75-77'],
	['dvorak-american-quartet', '380-382'],
	['beethoven-symphony-5-i', '1-3'],
] as const;
try {
	for (const [score, measures] of samples) {
		const xml = await fs.read(
			resolve(import.meta.dir, 'scores', `${score}.musicxml`),
		);
		const musicXML = new MeasureSlicer(measures).slice(xml);
		for (const engine of ['osmd', 'alphatab'] as const) {
			const { result } = await renderers[engine]({ musicXML }).eval(
				async (context, legacy) => {
					const Previous = new Function(
						`${legacy}; return SvgInkMasks;`,
					)() as new (
						container: Element,
					) => { capture(): Promise<InkMask[]> };
					return {
						current: await context.inkMasks(),
						previous: await new Previous(context.container).capture(),
					};
				},
				legacy,
			);
			const differences = result.current.filter(
				(mask, i) =>
					JSON.stringify(mask) !== JSON.stringify(result.previous[i]),
			);
			const currentFindings = new InkCollisions(result.current).findings();
			const previousFindings = new InkCollisions(result.previous).findings();
			const equal =
				differences.length === 0 &&
				result.current.length === result.previous.length;
			const sameFindings =
				JSON.stringify(currentFindings) === JSON.stringify(previousFindings);
			console.log(
				JSON.stringify({
					score,
					measures,
					engine,
					masks: result.current.length,
					previousMasks: result.previous.length,
					differentMasks: differences.length,
					equal,
					sameFindings,
					collisions: currentFindings.length,
				}),
			);
			if (!equal || !sameFindings) {
				throw new Error(`${score}/${engine}: mask comparison failed`);
			}
		}
	}
} finally {
	await renderers.disposeAsync();
}
