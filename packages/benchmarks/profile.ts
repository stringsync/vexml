import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { AlphaTabApi } from '@coderline/alphatab';
import { renderers } from '@vexml/renderer';
import { AlphatabRenderer } from '@vexml/renderer/alphatab-renderer';
import { OsmdRenderer } from '@vexml/renderer/osmd-renderer';
import { VexmlRenderer } from '@vexml/renderer/vexml-renderer';
import { MeasureSlicer } from '@vexml/vex/measure-slicer';
import { cli } from 'core/cmd';
import { NodeFs, NodePs } from 'core/system';
import { Stopwatch, SystemClock } from 'core/time';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { z } from 'zod';
import { profileRanges, selectProfileEntries } from './profile-selection';

// Optional diagnostics only: never imported by tests or the normal audit runner.
const fs = new NodeFs();
const ps = new NodePs();
const app = cli('profile-complete-scores');
const engines = ['vexml', 'osmd', 'alphatab'] as const;
type Engine = (typeof engines)[number];

function renderer(engine: Engine, musicXML: string) {
	if (engine === 'vexml') {
		return new VexmlRenderer({
			musicXML,
			config: {
				stretchSingleSystem: false,
				minLastSystemFill: 1,
				progressive: false,
			},
		});
	}
	if (engine === 'osmd') {
		return new OsmdRenderer({ musicXML });
	}
	return new AlphatabRenderer({ musicXML });
}

app
	.command('run')
	.option('output', z.string(), { default: '/tmp/vexml-renderer-profile' })
	.option('samples', z.coerce.number().int().min(3).max(5), { default: 3 })
	.option('mount-samples', z.coerce.number().int().min(0).max(5), {
		default: 0,
	})
	.option('revision', z.string().regex(/^[0-9a-f]{40}$/))
	.option('score', z.string(), { default: 'all' })
	.option('renderer', z.enum(['all', ...engines]), { default: 'all' })
	.option(
		'ranges',
		z.string().regex(/^$|^(?:all|\d+-\d+)(?:,(?:all|\d+-\d+))*$/),
		{
			default: '',
		},
	)
	.action(async (opts, { log }) => {
		await fs.mkdir(opts.output);
		const entries: { id: string; file: string }[] = JSON.parse(
			await fs.read(resolve(import.meta.dir, 'manifest.json')),
		);
		const selectedEntries = selectProfileEntries(entries, opts.score);
		const selectedEngines = engines.filter(
			(engine) => opts.renderer === 'all' || engine === opts.renderer,
		);
		const warmup = await fs.read(
			resolve(import.meta.dir, '../integration/__data__/note.musicxml'),
		);
		const timer = new Stopwatch(new SystemClock());
		const results: unknown[] = [];
		try {
			for (const engine of selectedEngines) {
				await renderer(engine, warmup).render();
			}
			for (const entry of selectedEntries) {
				const source = await fs.read(resolve(import.meta.dir, entry.file));
				const long =
					entry.id.includes('beethoven') || entry.id.includes('dvorak');
				for (const range of profileRanges(entry.id, opts.ranges)) {
					let musicXML = source;
					if (range !== 'all') {
						// vet-ignore classes-over-function-exports: MeasureSlicer is the shared stateful slicer used by CLI actions and library tests, not this profiling command's action.
						musicXML = new MeasureSlicer(range, 'standalone', 'position').slice(
							source,
						);
					}
					const inputSha256 = createHash('sha256')
						.update(musicXML)
						.digest('hex');
					for (const engine of selectedEngines) {
						const stem = resolve(opts.output, `${entry.id}-${range}-${engine}`);
						const target = renderer(engine, musicXML);
						const samples: {
							ms: number;
							width: number;
							height: number;
							sha256: string;
						}[] = [];
						// Full long scores get CPU/mount evidence, but their PNGs exceed the guard.
						if (!(long && range === 'all')) {
							for (let i = 0; i < opts.samples; i++) {
								timer.start();
								const image = await target.render();
								samples.push({
									ms: timer.elapsed().ms,
									width: image.readUInt32BE(16),
									height: image.readUInt32BE(20),
									sha256: createHash('sha256').update(image).digest('hex'),
								});
								if (i === 0) {
									await fs.writeBytes(`${stem}.png`, image);
								}
							}
						}
						const mountSamples: number[] = [];
						for (let i = 0; i < opts['mount-samples']; i++) {
							timer.start();
							await target.mount();
							mountSamples.push(timer.elapsed().ms);
						}
						const diagnostic = await target.profile((ctx) => {
							const box = ctx.container.getBoundingClientRect();
							const fonts: { family: string; status: string }[] = [];
							document.fonts.forEach((font) => {
								fonts.push({ family: font.family, status: font.status });
							});
							let content: unknown;
							if ('score' in ctx) {
								content = ctx.score.getParts().map((part) => ({
									id: part.getId(),
									measures: part.getMeasures().length,
									staves: Math.max(
										...part.getMeasures().map((m) => m.getStaves().length),
									),
									notes: part
										.getMeasures()
										.flatMap((m) => m.getVoices())
										.flatMap((v) => v.getNotes()).length,
								}));
							} else if ('alphatab' in ctx) {
								const api = ctx.alphatab as unknown as AlphaTabApi;
								content = {
									selectedTracks: api.tracks.length,
									parts: api.score?.tracks.map((track) => ({
										name: track.name,
										staves: track.staves.length,
										measures: track.staves.map((staff) => staff.bars.length),
										notes: track.staves
											.flatMap((s) => s.bars)
											.flatMap((b) => b.voices)
											.flatMap((v) => v.beats)
											.flatMap((b) => b.notes).length,
										lyrics: track.staves
											.flatMap((s) => s.bars)
											.flatMap((b) => b.voices)
											.flatMap((v) => v.beats)
											.filter((b) => b.lyrics?.length).length,
									})),
								};
							} else {
								const api = ctx.osmd as unknown as OpenSheetMusicDisplay;
								content = {
									parts: api.Sheet.Instruments.length,
									measures: api.Sheet.SourceMeasures.length,
									notes: api.Sheet.SourceMeasures.flatMap(
										(m) => m.VerticalSourceStaffEntryContainers,
									)
										.flatMap((v) => v.StaffEntries)
										.filter(Boolean)
										.flatMap((s) => s.VoiceEntries)
										.flatMap((v) => v.Notes).length,
								};
							}
							return {
								width: box.width,
								height: box.height,
								dpr: window.devicePixelRatio,
								fontStatus: document.fonts.status,
								fonts,
								content,
								text: ctx.container.textContent,
								svgCount: ctx.container.querySelectorAll('svg').length,
								canvasCount: ctx.container.querySelectorAll('canvas').length,
							};
						});
						await fs.write(
							`${stem}-mount.cpuprofile`,
							JSON.stringify(diagnostic.mount.profile),
						);
						if (diagnostic.capture) {
							await fs.write(
								`${stem}-capture.cpuprofile`,
								JSON.stringify(diagnostic.capture.profile),
							);
						}
						const row = {
							sourceRevision: opts.revision,
							score: entry.id,
							inputSha256,
							range,
							engine,
							samples,
							mountSamples,
							mountMs: diagnostic.mount.ms,
							captureMs: diagnostic.capture?.ms,
							captureError: diagnostic.captureError,
							evidence: diagnostic.evidence,
						};
						results.push(row);
						await fs.write(
							resolve(opts.output, 'results.json'),
							JSON.stringify(results, null, 2),
						);
						log.info(
							`${entry.id} ${range} ${engine}: mount ${Math.round(row.mountMs)}ms; capture ${row.captureError ?? Math.round(row.captureMs ?? 0)}`,
						);
					}
				}
			}
		} finally {
			timer.dispose();
			await renderers.disposeAsync();
		}
	});

await app.run({ ps });
