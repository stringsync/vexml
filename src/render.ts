import type { Chord, Note, Voice as ScoreVoice } from '@stringsync/mdom';
import { MDOMParser, type MDocument } from '@stringsync/mdom';
import {
	Accidental,
	Articulation,
	Barline,
	Beam,
	Curve,
	Dot,
	Formatter,
	type RenderContext,
	Renderer,
	Stave,
	StaveConnector,
	StaveNote,
	StaveTie,
	Stem,
	TabStave,
	Tuplet,
	Voice,
} from 'vexflow';

// MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
// unknown combinations fall back to treble.
function vexflowClef(sign: string, line: number | null): string {
	switch (sign) {
		case 'F':
			return 'bass';
		case 'C':
			return line === 4 ? 'tenor' : 'alto';
		case 'percussion':
			return 'percussion';
		default:
			return 'treble';
	}
}

// MusicXML <type> -> vexflow duration code; rests append 'r'.
const DURATION_CODES: Record<string, string> = {
	whole: 'w',
	half: 'h',
	quarter: 'q',
	eighth: '8',
	'16th': '16',
	'32nd': '32',
	'64th': '64',
	'128th': '128',
};

// MusicXML <accidental> glyph name -> vexflow accidental code.
const ACCIDENTAL_CODES: Record<string, string> = {
	sharp: '#',
	flat: 'b',
	natural: 'n',
	'double-sharp': '##',
	'flat-flat': 'bb',
};

// A note's vexflow key, e.g. C#5 -> 'c/5'. Rests have no pitch; callers handle them.
function vexflowKey(note: Note): string {
	const pitch = note.pitch;
	return pitch ? `${pitch.step.toLowerCase()}/${pitch.octave}` : 'b/4';
}

// Augmentation dots.
function addDots(staveNote: StaveNote, note: Note): void {
	for (let i = 0; i < note.dots; i++) {
		Dot.buildAndAttach([staveNote], { all: true });
	}
}

// MusicXML <articulations> name -> vexflow articulation code.
const ARTICULATION_CODES: Record<string, string> = {
	staccato: 'a.',
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'strong-accent': 'a^',
};

function addArticulations(staveNote: StaveNote, note: Note): void {
	for (const name of note.articulations) {
		const code = ARTICULATION_CODES[name];
		if (code) {
			staveNote.addModifier(new Articulation(code));
		}
	}
}

// Honor an explicit <stem>up|down (e.g. to separate two voices on one stave).
// Absent, vexflow picks the stem direction itself.
function applyStem(staveNote: StaveNote, note: Note): void {
	switch (note.stem) {
		case 'up':
			staveNote.setStemDirection(Stem.UP);
			break;
		case 'down':
			staveNote.setStemDirection(Stem.DOWN);
			break;
	}
}

// Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
// a single note is a one-member chord). Rests render as a centered rest glyph;
// pitched notes stack their keys and carry each member's printed accidental,
// dots, stem direction, and articulations.
function vexflowChord(chord: Chord, clef: string): StaveNote {
	const lead = chord.lead;
	const duration = DURATION_CODES[lead.type ?? 'quarter'] ?? 'q';
	if (lead.isRest) {
		const rest = new StaveNote({ keys: ['b/4'], duration: `${duration}r` });
		addDots(rest, lead);
		return rest;
	}
	const staveNote = new StaveNote({
		keys: chord.notes.map(vexflowKey),
		duration,
		clef,
	});
	chord.notes.forEach((note, i) => {
		const code = note.accidental && ACCIDENTAL_CODES[note.accidental.value];
		if (code) {
			staveNote.addModifier(new Accidental(code), i);
		}
	});
	addDots(staveNote, lead);
	applyStem(staveNote, lead);
	addArticulations(staveNote, lead);
	return staveNote;
}

// Beams: mdom groups the <beam> runs (measure.beams); map each group's notes to
// their StaveNotes. Built before formatting so the beamed notes drop their flags.
function buildBeams(groups: Note[][], byLead: Map<Note, StaveNote>): Beam[] {
	const beams: Beam[] = [];
	for (const group of groups) {
		const notes = group
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined);
		if (notes.length > 1) {
			beams.push(new Beam(notes));
		}
	}
	return beams;
}

// Tuplets: a <tuplet>start..stop span covers every note between the two markers
// (the inner notes carry no marker), so slice the chord run by index. The ratio
// comes from the start note's <time-modification> (e.g. 3:2 -> "3").
function buildTuplets(chords: Chord[], byLead: Map<Note, StaveNote>): Tuplet[] {
	const tuplets: Tuplet[] = [];
	let start = -1;
	chords.forEach((chord, i) => {
		for (const tuplet of chord.lead.tuplets) {
			if (tuplet.tupletType === 'start') {
				start = i;
			} else if (tuplet.tupletType === 'stop' && start >= 0) {
				const group = chords
					.slice(start, i + 1)
					.map((c) => byLead.get(c.lead))
					.filter((n): n is StaveNote => n !== undefined);
				if (group.length > 1) {
					const ratio = chords[start]?.lead.timeModification;
					tuplets.push(
						new Tuplet(
							group,
							ratio
								? { numNotes: ratio.actual, notesOccupied: ratio.normal }
								: undefined,
						),
					);
				}
				start = -1;
			}
		}
	});
	return tuplets;
}

// Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
// ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
function buildTies(chords: Chord[], byLead: Map<Note, StaveNote>): StaveTie[] {
	const ties: StaveTie[] = [];
	for (const chord of chords) {
		const firstNote = byLead.get(chord.lead);
		for (const tie of chord.lead.ties) {
			if (tie.tieType !== 'start' || !tie.partner || !firstNote) {
				continue;
			}
			const lastNote = byLead.get(tie.partner.note);
			if (lastNote) {
				ties.push(
					new StaveTie({
						firstNote,
						lastNote,
						firstIndexes: [0],
						lastIndexes: [0],
					}),
				);
			}
		}
	}
	return ties;
}

function buildSlurs(chords: Chord[], byLead: Map<Note, StaveNote>): Curve[] {
	const slurs: Curve[] = [];
	for (const chord of chords) {
		const from = byLead.get(chord.lead);
		for (const slur of chord.lead.slurs) {
			if (slur.slurType !== 'start' || !slur.partner || !from) {
				continue;
			}
			const to = byLead.get(slur.partner.note);
			if (to) {
				// <slur placement="above"> arcs over the top (anchored at the stem
				// tops, opening downward); otherwise vexflow picks the side from the
				// notes' stems.
				const options =
					slur.placement === 'above'
						? {
								position: Curve.Position.NEAR_TOP,
								openingDirection: 'down' as const,
							}
						: {};
				slurs.push(new Curve(from, to, options));
			}
		}
	}
	return slurs;
}

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

// A measure's note-area width: the musical-time width (ticks * pxPerTick) so equal
// durations get equal space everywhere, never below the collision-free minimum or
// the floor. Builds throwaway notes so the draw pass is untouched. The busiest
// staff wins (all staves in a measure share one width).
function measureNoteArea(
	staves: { voices: ScoreVoice[]; clef: string }[],
	floor: number,
	pxPerTick: number,
	softmaxFactor: number,
): number {
	let minNotes = 0;
	let ticks = 0;
	for (const { voices, clef } of staves) {
		const vexVoices = voices.map((voice) =>
			new Voice()
				.setMode(Voice.Mode.SOFT)
				.setSoftmaxFactor(softmaxFactor)
				.addTickables(voice.chords.map((chord) => vexflowChord(chord, clef))),
		);
		if (vexVoices.length === 0) {
			continue;
		}
		minNotes = Math.max(
			minNotes,
			new Formatter({ softmaxFactor })
				.joinVoices(vexVoices)
				.preCalculateMinTotalWidth(vexVoices),
		);
		for (const vexVoice of vexVoices) {
			ticks = Math.max(ticks, vexVoice.getTicksUsed().value());
		}
	}
	return Math.max(floor, minNotes, ticks * pxPerTick);
}

/** How measures are placed across systems. */
export type Layout =
	| {
			/** Wrap measures onto stacked systems (print-like). */
			type: 'standard';
			/** Reference layout width in px. The score is laid out to this width once;
			 * the SVG viewBox then scales the result to whatever container it's placed
			 * in, so resizing the container never re-flows or re-spaces it. */
			width: number;
	  }
	| {
			/** Lay every measure on one system (horizontal scroll); width is computed
			 * from the content. */
			type: 'panoramic';
	  };

export type RenderOptions = {
	/** How measures are placed across systems (default: standard at 1000px). */
	layout?: Layout;
	/** *How much space the notes get* (not how its divided): horizontal px per tick of musical
	 * time. The spacing-density knob — bigger spreads every measure wider, so identical content
	 * stays the same width everywhere in the piece. */
	pxPerTick?: number;
	/** *How the space notes get is divided* (not how much): vexflow's note-spacing curve.
	 * Given the width pxPerTick allots, higher exaggerates the long-vs-short note ratio. A
	 * shape constant, independent of overall density. */
	softmaxFactor?: number;
};

export async function render(
	input: string | Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	if (typeof input === 'string') {
		return renderMusicXML(input, element, options);
	}
	if (input instanceof Blob) {
		return renderMXL(input, element, options);
	}
	throw new TypeError('render: input is not a string or Blob');
}

function renderMDoc(
	mdoc: MDocument,
	element: HTMLElement,
	options?: RenderOptions,
) {
	// An empty score has no parts and nothing to draw; leave the element empty.
	const parts = mdoc.score.parts;
	if (parts.length === 0) {
		return;
	}

	const layout = options?.layout ?? { type: 'standard', width: 1000 };
	const layoutMode = layout.type;
	// Panoramic computes its own width; 1000 is the page's starting floor.
	const width = layout.type === 'standard' ? layout.width : 1000;
	// Absolute floor for a measure's note area.
	const baseVoiceWidth = 80;
	const pxPerTick = options?.pxPerTick ?? 0.012;
	const softmaxFactor = options?.softmaxFactor ?? 10;

	// vexflow's type only admits div/canvas; the SVG backend appends a child to any element.
	const renderer = new Renderer(
		element as HTMLDivElement,
		Renderer.Backends.SVG,
	);
	const context = renderer.getContext();

	// ponytail: measures laid left-to-right; every part's staves stack vertically
	// down the page. A part with >1 stave is joined by a brace; multiple parts are
	// grouped by a bracket, and the whole system shares a left/right barline.
	// Staves within a part sit further apart than the gap between parts, so the
	// brace-joined group reads as one instrument.
	// Left margin leaves room for the brace/bracket, which draw left of the stave's x.
	const x = 30;
	const y = 40;
	const intraPartSpacing = 120;
	const interPartSpacing = 80;
	const measureCount = Math.max(
		1,
		...parts.map((part) => part.measures.length),
	);
	const totalStaves = parts.reduce(
		(sum, part) => sum + Math.max(part.staveCount, 1),
		0,
	);
	// Precompute each stave's y-offset within a system: a within-part gap after
	// every stave except a part's last, which gets the smaller inter-part gap.
	const staveOffsets: number[] = [];
	let offset = 0;
	for (const part of parts) {
		const staveCount = Math.max(part.staveCount, 1);
		for (let s = 0; s < staveCount; s++) {
			staveOffsets.push(offset);
			offset += s === staveCount - 1 ? interPartSpacing : intraPartSpacing;
		}
	}

	const usable = width - 2 * x;

	// --- Spacing (content only) ---------------------------------------------------
	// A measure's note area is a pure function of its music: the musical-time width
	// (ticks * pxPerTick), floored at the collision-free minimum and baseVoiceWidth.
	// One global pxPerTick means identical content is identically wide everywhere in
	// the piece. The container never changes this — it only scales the finished layout
	// via the SVG viewBox.
	const noteAreas = Array.from({ length: measureCount }, (_, m) => {
		const staves: { voices: ScoreVoice[]; clef: string }[] = [];
		for (const part of parts) {
			const measure = part.measures[m];
			if (!measure) {
				continue;
			}
			const staveCount = Math.max(part.staveCount, 1);
			for (let s = 0; s < staveCount; s++) {
				const staffNumber = String(s + 1);
				const clef = measure.getClef(staffNumber);
				// TAB notes aren't drawn yet, so they reserve no note width.
				if (clef?.sign === 'TAB') {
					continue;
				}
				const voices = measure.voices.filter(
					(v) => v.staff === staffNumber && v.chords.length > 0,
				);
				if (voices.length > 0) {
					staves.push({
						voices,
						clef: clef ? vexflowClef(clef.sign, clef.line) : 'treble',
					});
				}
			}
		}
		return measureNoteArea(staves, baseVoiceWidth, pxPerTick, softmaxFactor);
	});

	// Lead = glyphs a stave prints before its notes. Clef (+ key, when present)
	// repeats at every system start; the time signature prints once at the piece
	// start; mid-system measures carry only a barline.
	// ponytail: fixed, deliberately generous estimates so notes never collide with
	// the glyphs; measure stave.getNoteStartX() if exact alignment is ever needed.
	const leadCont = 12;
	const leadFull = (m: number) => {
		const hasKey = parts.some((part) => part.measures[m]?.getKey()?.rootNote);
		return 12 + 32 + (hasKey ? 40 : 0) + (m === 0 ? 32 : 0);
	};
	const leadOf = (m: number, systemStart: boolean) =>
		systemStart ? leadFull(m) : leadCont;

	// --- Breaks -------------------------------------------------------------------
	// Standard: wrap to a new system once the next measure's note area would overrun
	// the reference width. Panoramic: one system holding every measure. Either way
	// breaks depend only on the music and width, never on the live container.
	const systems: number[][] = [];
	if (layoutMode === 'panoramic') {
		systems.push(Array.from({ length: measureCount }, (_, m) => m));
	} else {
		let row: number[] = [];
		let rowWidth = 0;
		for (let m = 0; m < measureCount; m++) {
			const area = noteAreas[m] ?? baseVoiceWidth;
			if (row.length > 0 && rowWidth + leadCont + area > usable) {
				systems.push(row);
				row = [];
				rowWidth = 0;
			}
			rowWidth += leadOf(m, row.length === 0) + area;
			row.push(m);
		}
		if (row.length > 0) {
			systems.push(row);
		}
	}

	// --- Placement ----------------------------------------------------------------
	// Lay each system left to right at intrinsic (note-area) widths. Full systems are
	// justified to the reference width by stretching note areas proportionally (the
	// per-tick rate stays uniform within the system); the last/partial system — and
	// all of panoramic — stay ragged, so a short line or lone measure keeps its
	// natural width instead of being needlessly stretched.
	type MeasureBox = {
		x: number;
		width: number;
		systemIndex: number;
		isSystemStart: boolean;
		isSystemEnd: boolean;
	};
	const boxes: MeasureBox[] = [];
	let naturalWidth = width;
	systems.forEach((measures, systemIndex) => {
		const leads = measures.map((m, i) => leadOf(m, i === 0));
		const areas = measures.map((m) => noteAreas[m] ?? baseVoiceWidth);
		const areaSum = areas.reduce((sum, a) => sum + a, 0);
		const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
		const justify =
			layoutMode === 'standard' && systemIndex < systems.length - 1;
		const slack = justify ? Math.max(0, usable - intrinsic) : 0;
		const areaScale = areaSum > 0 ? (areaSum + slack) / areaSum : 1;
		let cx = x;
		measures.forEach((m, i) => {
			const w = (leads[i] ?? 0) + (areas[i] ?? 0) * areaScale;
			boxes[m] = {
				x: cx,
				width: w,
				systemIndex,
				isSystemStart: i === 0,
				isSystemEnd: i === measures.length - 1,
			};
			cx += w;
		});
		// Standard stays at the reference width (short lines sit left with margin,
		// never scaled up; an over-wide measure overflows rather than rescaling the
		// page); panoramic grows the page to fit its single long system.
		if (layoutMode === 'panoramic') {
			naturalWidth = Math.max(naturalWidth, cx + x);
		}
	});

	// Systems stack top-to-bottom. Each is placed below the previous system's lowest
	// drawn content (notes + staff lines), so deep ledger lines push the next system
	// down instead of colliding with it — fixed spacing can't, since note range is
	// unbounded. SYSTEM_GAP is the visual gap plus room for the next system's notes
	// that rise above its top staff.
	// ponytail: fixed upward clearance in SYSTEM_GAP; pre-measure per-system note
	// extent if an extreme tessitura ever rises into the system above.
	const SYSTEM_GAP = 90;
	const floorHeight = y + offset + 40;
	renderer.resize(naturalWidth, floorHeight); // provisional; grown after drawing

	let pageBottom = 0;
	let systemTopY = y;
	let systemContentBottom = y;
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
				systemTopY = systemContentBottom + SYSTEM_GAP;
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
	renderer.resize(naturalWidth, Math.max(floorHeight, pageBottom + 40));
}

function renderMusicXML(
	musicXML: string,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = parser.parseFromString(musicXML);
	return renderMDoc(mdoc, element, options);
}

async function renderMXL(
	mxl: Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = await parser.parseFromBlob(mxl);
	return renderMDoc(mdoc, element, options);
}
