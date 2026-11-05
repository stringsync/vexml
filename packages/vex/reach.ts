import { basename, isAbsolute, resolve } from 'node:path';
import { renderers } from '@vexml/renderer';
import type { Logger } from 'core/log';
import type { Fs } from 'core/system';
import { type ReachReport, SpannerReach } from './spanner-reach';
import { reachCapture } from './spanner-reach-capture';

export interface ReachOptions {
	/* Complete MusicXML scores: `vex slice` restores spans at its cuts, so a slice misleads. */
	inputs: string[];
	cwd: string;
	log: Logger;
	fs: Fs;
}

/** One pixel tolerance at the capture's 1x ratio. */
const TOLERANCE = { near: 16, vertical: 100, breakEnd: 48, resume: 120 };

/**
 * Renders each score through vexml and checks every source slur, tie and hairpin reaches
 * its endpoints in the drawing. Complements `vex lint`, which judges ink contacts and so
 * misses a spanner that is short or missing. Fails when any spanner falls short.
 */
export async function reach(opts: ReachOptions): Promise<void> {
	const reports = new Map<string, ReachReport>();
	try {
		for (const input of opts.inputs) {
			const path = isAbsolute(input) ? input : resolve(opts.cwd, input);
			const musicXML = await opts.fs.read(path);
			const result = await renderers.vexml({ musicXML }).inspect(reachCapture);
			const scale = result.ratio;
			const tolerance = {
				near: TOLERANCE.near * scale,
				vertical: TOLERANCE.vertical * scale,
				breakEnd: TOLERANCE.breakEnd * scale,
				resume: TOLERANCE.resume * scale,
			};
			const systems = new Map(result.systems.map((s) => [s.index, s.box]));
			reports.set(
				basename(path),
				new SpannerReach(result.masks, systems, tolerance).check(result.spans),
			);
		}
	} finally {
		await renderers.disposeAsync();
	}
	let failed = 0;
	for (const [name, report] of reports) {
		const { slur, tie, hairpin } = report.checked;
		opts.log.info(
			`${name}: ${report.findings.length} short or missing of ${slur} slurs, ${tie} ties, ${hairpin} hairpins`,
		);
		const counts = new Map<string, number>();
		for (const f of report.findings) {
			const key = `${f.kind} ${f.problem}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		for (const [key, count] of counts) {
			opts.log.info(`  ${key}: ${count}`);
		}
		for (const f of report.findings) {
			opts.log.info(`  - ${f.kind} from measure ${f.measure}: ${f.message}`);
		}
		failed += report.findings.length;
	}
	if (failed > 0) {
		throw new Error(`${failed} spanners fall short of their endpoints`);
	}
}
