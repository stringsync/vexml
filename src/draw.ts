import type { Note, Part, Voice as ScoreVoice } from '@stringsync/mdom';
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
import { vexflowChord, vexflowClef } from './stave-notes';

// Draw a staff's notes on top of an already-drawn stave. Each mdom voice becomes
// a vexflow voice; multiple voices are aligned together and stem apart. Beams and
// tuplets are per-voice (positional); ties and slurs resolve across the staff.
function drawNotes(
	context: RenderContext,
	stave: Stave,
	voices: ScoreVoice[],
	beamGroups: Note[][],
	clef: string,
	softmaxFactor: number,
): number {
	const byLead = new Map<Note, StaveNote>();
	const perVoice = voices.map((voice) => {
		const staveNotes = voice.chords.map((chord) => {
			const staveNote = vexflowChord(chord, clef);
			byLead.set(chord.lead, staveNote);
			return staveNote;
		});
		const vexVoice = new Voice()
			.setMode(Voice.Mode.SOFT)
			.setSoftmaxFactor(softmaxFactor)
			.addTickables(staveNotes);
		return { staveNotes, vexVoice };
	});

	// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be
	// built before formatting.
	const beams = buildBeams(beamGroups, byLead);
	const tuplets = voices.flatMap((v) => buildTuplets(v.chords, byLead));
	const allChords = voices.flatMap((v) => v.chords);
	const ties = buildTies(allChords, byLead);
	const slurs = buildSlurs(allChords, byLead);

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
	for (const tie of ties) {
		tie.setContext(context).draw();
	}
	for (const slur of slurs) {
		slur.setContext(context).draw();
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
		const { isSystemStart, isSystemEnd } = box;
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
				stave.setBegBarType(Barline.type.SINGLE);
				stave.setEndBarType(Barline.type.SINGLE);

				// Clef, key, and time signature print at the start of each system;
				// later measures on the same row carry them forward silently.
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
					const key = measure.getKey();
					if (key?.rootNote) {
						stave.addKeySignature(key.rootNote);
					}
				}

				// Unlike clef and key (which repeat every system), the time signature
				// prints once at the start of the piece.
				// ponytail: piece-start only; add change-detection when a mid-piece
				// meter change needs to redraw it.
				if (m === 0) {
					const time = measure.getTime();
					if (time?.symbol === 'common') {
						stave.addTimeSignature('C');
					} else if (time?.symbol === 'cut') {
						stave.addTimeSignature('C|');
					} else if (time?.beats && time?.beatType) {
						stave.addTimeSignature(`${time.beats}/${time.beatType}`);
					}
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
					);
					pageBottom = Math.max(pageBottom, noteBottom);
					systemContentBottom = Math.max(systemContentBottom, noteBottom);
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
			if (isSystemEnd) {
				new StaveConnector(systemTop, systemBottom)
					.setType('singleRight')
					.setContext(context)
					.draw();
			}
		}
	}

	// Grow the page to the lowest thing actually drawn so deep ledger lines in the
	// bottom system aren't clipped.
	renderer.resize(width, Math.max(floorHeight, pageBottom + 40));
}
