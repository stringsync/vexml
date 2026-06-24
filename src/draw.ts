import type {
	Chord,
	Note,
	Part,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import {
	Barline,
	Formatter,
	type RenderContext,
	Renderer,
	Stave,
	StaveConnector,
	type StaveNote,
	TabStave,
	Voice,
} from 'vexflow';
import type { ScoreLayout } from './layout';
import { buildBeams, buildSlurs, buildTies, buildTuplets } from './spanners';
import { endBeatOf, vexflowClef, vexflowVoiceTickables } from './stave-notes';

// MusicXML <time> -> vexflow time-signature spec: 'C' (common), 'C|' (cut), or
// "beats/beat-type". null when there's nothing drawable. Doubles as the equality
// key for detecting a mid-piece meter change.
function timeSignatureSpec(time: Time | null): string | null {
	if (time?.symbol === 'common') {
		return 'C';
	}
	if (time?.symbol === 'cut') {
		return 'C|';
	}
	if (time?.beats && time?.beatType) {
		return `${time.beats}/${time.beatType}`;
	}
	return null;
}

// Draw a staff's notes on top of an already-drawn stave. Each mdom voice becomes
// a vexflow voice; multiple voices are aligned together and stem apart. Beams and
// tuplets are per-voice (positional) and built here; ties and slurs can span
// measures, so the caller resolves them once over the whole score (this only
// records each chord's StaveNote in the shared `byLead` map).
function drawNotes(
	context: RenderContext,
	stave: Stave,
	voices: ScoreVoice[],
	beamGroups: Note[][],
	clef: string,
	softmaxFactor: number,
	byLead: Map<Note, StaveNote>,
): number {
	const endBeat = endBeatOf(voices);
	const perVoice = voices.map((voice) => {
		// Real notes only (no gap-filling ghosts), for the bottom-bound calc below.
		const staveNotes: StaveNote[] = [];
		const tickables = vexflowVoiceTickables(
			voice.chords,
			clef,
			endBeat,
			(lead, note) => {
				byLead.set(lead, note);
				staveNotes.push(note);
			},
		);
		const vexVoice = new Voice()
			.setMode(Voice.Mode.SOFT)
			.setSoftmaxFactor(softmaxFactor)
			.addTickables(tickables);
		return { staveNotes, vexVoice };
	});

	// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be
	// built before formatting.
	const beams = buildBeams(beamGroups, byLead);
	const tuplets = voices.flatMap((v) => buildTuplets(v.chords, byLead));

	// Fill the stave's note area (its width minus the lead glyphs) with the notes.
	// The note area was sized to a global px-per-tick, so spacing stays consistent
	// across measures.
	const vexVoices = perVoice.map((v) => v.vexVoice);
	new Formatter({ softmaxFactor })
		.joinVoices(vexVoices)
		.formatToStave(vexVoices, stave);
	for (const vexVoice of vexVoices) {
		vexVoice.draw(context, stave);
	}

	for (const beam of beams) {
		beam.setContext(context).draw();
	}
	for (const tuplet of tuplets) {
		tuplet.setContext(context).draw();
	}

	// Lowest y any note reaches, so the page can grow to fit (deep ledger lines
	// below the staff would otherwise be clipped).
	let bottom = 0;
	for (const v of perVoice) {
		for (const note of v.staveNotes) {
			const box = note.getBoundingBox();
			bottom = Math.max(bottom, box.getY() + box.getH());
		}
	}
	return bottom;
}

// Draw the whole score onto the element: one SVG stave per part-staff per measure,
// placed at the boxes computed by computeLayout, with clefs/keys/time signatures,
// notes, and the brace/barline connectors that group parts into systems.
export function drawScore(
	element: HTMLElement,
	parts: Part[],
	layout: ScoreLayout,
): void {
	const {
		measureCount,
		boxes,
		staveOffsets,
		totalStaves,
		softmaxFactor,
		systemGap,
		width,
		floorHeight,
	} = layout;

	// vexflow's type only admits div/canvas; the SVG backend appends a child to any element.
	const renderer = new Renderer(
		element as HTMLDivElement,
		Renderer.Backends.SVG,
	);
	const context = renderer.getContext();
	renderer.resize(width, floorHeight); // provisional; grown after drawing

	// One note map for the whole score: ties and slurs can span a barline, so their
	// two endpoints may live in different measures. Notes are drawn measure by
	// measure (recording into this map); the spanners are resolved once at the end.
	const byLead = new Map<Note, StaveNote>();
	const allChords: Chord[] = [];

	// Systems stack top-to-bottom. Each is placed below the previous system's lowest
	// drawn content (notes + staff lines), so deep ledger lines push the next system
	// down instead of colliding with it — fixed spacing can't, since note range is
	// unbounded.
	let pageBottom = 0;
	let systemTopY = layout.top;
	let systemContentBottom = layout.top;
	let currentSystem = -1;
	for (let m = 0; m < measureCount; m++) {
		const box = boxes[m];
		if (!box) {
			continue;
		}
		const { x: measureX, width: measureWidth, systemIndex } = box;
		const { isSystemStart } = box;
		const isLastMeasure = m === measureCount - 1;
		if (systemIndex !== currentSystem) {
			if (currentSystem >= 0) {
				systemTopY = systemContentBottom + systemGap;
			}
			currentSystem = systemIndex;
			systemContentBottom = systemTopY;
		}
		const systemY = systemTopY;
		let staveRow = 0;
		let systemTop: Stave | undefined;
		let systemBottom: Stave | undefined;

		for (const part of parts) {
			const staveCount = Math.max(part.staveCount, 1);
			const measure = part.measures[m];
			if (!measure) {
				staveRow += staveCount;
				continue;
			}

			let partTop: Stave | undefined;
			let partBottom: Stave | undefined;

			for (let s = 0; s < staveCount; s++) {
				const staffNumber = String(s + 1);
				const clef = measure.getClef(staffNumber);
				const staveY = systemY + (staveOffsets[staveRow] ?? 0);

				// A TAB clef draws on a TabStave whose line count matches the
				// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
				const isTab = clef?.sign === 'TAB';
				const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
				const stave = isTab
					? new TabStave(measureX, staveY, measureWidth, { numLines: tabLines })
					: new Stave(measureX, staveY, measureWidth);
				// Only draw the end barline. Each measure's end barline is the same line
				// as the next measure's left edge, so internal measures still get a divider;
				// only the first measure of a system loses its left barline (intended). The
				// stave connector marks the system's left edge for multi-staff parts. The
				// final measure of the piece closes with a thin-thick end barline.
				stave.setBegBarType(Barline.type.NONE);
				stave.setEndBarType(
					isLastMeasure ? Barline.type.END : Barline.type.SINGLE,
				);

				// The previous measure's effective signatures (carried forward), used to
				// spot a mid-system change. getKey/getTime return what's in effect at the
				// measure start, so M3 of a piece that changed key at M2 reads the same
				// key as M2 — no spurious redraw.
				const prevMeasure = part.measures[m - 1];
				const key = measure.getKey(staffNumber);
				const keyChanged =
					(key?.rootNote ?? null) !==
					(prevMeasure?.getKey(staffNumber)?.rootNote ?? null);

				// Clef and key print at every system start (re-stated on each new line).
				// A mid-system key change is also redrawn where it happens (clef and time
				// are not repeated for it).
				if (isSystemStart) {
					if (isTab) {
						(stave as TabStave).addTabGlyph();
						// The "TAB" glyph is drawn for a 6-line staff; shrink and re-center
						// it so the word fits a shorter staff (e.g. a 4-string bass).
						if (tabLines !== 6) {
							const [tabClef] = stave.getModifiers(
								undefined,
								'Clef',
							) as unknown as Array<{
								line: number;
								fontInfo: { size: number };
							}>;
							if (tabClef) {
								tabClef.fontInfo.size *= (tabLines - 1) / 5;
								tabClef.line = (tabLines - 1) / 2;
							}
						}
					} else if (clef) {
						stave.addClef(vexflowClef(clef.sign, clef.line));
					}
					if (key?.rootNote) {
						stave.addKeySignature(key.rootNote);
					}
				} else if (key?.rootNote && keyChanged) {
					stave.addKeySignature(key.rootNote);
				}

				// Unlike clef and key, the time signature is not re-stated at every
				// system start — only at the piece start and wherever the meter changes
				// (a change that lands on a system break still redraws here).
				const timeSpec = timeSignatureSpec(measure.getTime(staffNumber));
				const prevTimeSpec = timeSignatureSpec(
					prevMeasure?.getTime(staffNumber) ?? null,
				);
				if (timeSpec && (m === 0 || timeSpec !== prevTimeSpec)) {
					stave.addTimeSignature(timeSpec);
				}

				stave.setContext(context).draw();
				const staveBottom = stave.getBottomY();
				pageBottom = Math.max(pageBottom, staveBottom);
				systemContentBottom = Math.max(systemContentBottom, staveBottom);

				// Draw this staff's notes on top of the stave. TAB notes need their own
				// glyphs (string/fret), which no roadmap case exercises yet — skip them.
				// An empty voice (no chords) would crash the formatter, so it's filtered.
				const voices = measure.voices.filter(
					(v) => v.staff === staffNumber && v.chords.length > 0,
				);
				if (!isTab && voices.length > 0) {
					const clefName = clef ? vexflowClef(clef.sign, clef.line) : 'treble';
					const noteBottom = drawNotes(
						context,
						stave,
						voices,
						measure.beams,
						clefName,
						softmaxFactor,
						byLead,
					);
					pageBottom = Math.max(pageBottom, noteBottom);
					systemContentBottom = Math.max(systemContentBottom, noteBottom);
					for (const voice of voices) {
						allChords.push(...voice.chords);
					}
				}

				partTop ??= stave;
				partBottom = stave;
				systemTop ??= stave;
				systemBottom = stave;
				staveRow++;
			}

			// A part's own staves are joined by a brace at each system start.
			if (partTop && partBottom && staveCount > 1 && isSystemStart) {
				new StaveConnector(partTop, partBottom)
					.setType('brace')
					.setContext(context)
					.draw();
			}
		}

		// Join the whole system across all parts with a shared left line at the
		// system start, and a closing line at the system end.
		if (systemTop && systemBottom && totalStaves > 1) {
			if (isSystemStart) {
				new StaveConnector(systemTop, systemBottom)
					.setType('singleLeft')
					.setContext(context)
					.draw();
			}
			// Every measure's end line gets a connector joining the part's staves, so
			// internal barlines are tied across staves and not just drawn per-stave.
			// The piece's final measure gets a bold thin-thick connector to match its
			// end barline; all other measure ends get a plain single line.
			new StaveConnector(systemTop, systemBottom)
				.setType(isLastMeasure ? 'boldDoubleRight' : 'singleRight')
				.setContext(context)
				.draw();
		}
	}

	// Ties and slurs are resolved over the whole score now that every note is
	// placed, so a span can cross a barline (its endpoints sit in different
	// measures). Drawn last, on top of the notes.
	for (const tie of buildTies(allChords, byLead)) {
		tie.setContext(context).draw();
	}
	for (const slur of buildSlurs(allChords, byLead)) {
		slur.setContext(context).draw();
	}

	// Grow the page to the lowest thing actually drawn so deep ledger lines in the
	// bottom system aren't clipped.
	renderer.resize(width, Math.max(floorHeight, pageBottom + 40));
}
