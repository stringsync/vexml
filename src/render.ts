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
): void {
	const byLead = new Map<Note, StaveNote>();
	const perVoice = voices.map((voice) => {
		const staveNotes = voice.chords.map((chord) => {
			const staveNote = vexflowChord(chord, clef);
			byLead.set(chord.lead, staveNote);
			return staveNote;
		});
		return { chords: voice.chords, staveNotes };
	});

	// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be
	// built before formatting.
	const beams = buildBeams(beamGroups, byLead);
	const tuplets = perVoice.flatMap((v) => buildTuplets(v.chords, byLead));
	const allChords = voices.flatMap((v) => v.chords);
	const ties = buildTies(allChords, byLead);
	const slurs = buildSlurs(allChords, byLead);

	if (perVoice.length === 1) {
		Formatter.FormatAndDraw(context, stave, perVoice[0]?.staveNotes ?? []);
	} else {
		const vexVoices = perVoice.map((v) =>
			new Voice().setMode(Voice.Mode.SOFT).addTickables(v.staveNotes),
		);
		new Formatter().joinVoices(vexVoices).formatToStave(vexVoices, stave);
		for (const voice of vexVoices) {
			voice.draw(context, stave);
		}
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
}

export type RenderOptions = {
	config?: { WIDTH?: number; [key: string]: unknown };
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

	const width = options?.config?.WIDTH ?? 500;

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
	const measureCount = Math.max(parts[0]?.measures.length ?? 0, 1);
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

	// Measures wrap onto a new system (row) once a row is full; each system is the
	// full stave stack plus a gap before the next.
	const minMeasureWidth = 150;
	const measuresPerSystem = Math.max(
		1,
		Math.floor((width - 2 * x) / minMeasureWidth),
	);
	const systemHeight = offset + 40;
	const systemCount = Math.ceil(measureCount / measuresPerSystem);

	// Height grows with every system so the bottom one isn't clipped.
	renderer.resize(width, y + (systemCount - 1) * systemHeight + offset + 40);

	for (let m = 0; m < measureCount; m++) {
		const systemIndex = Math.floor(m / measuresPerSystem);
		const posInSystem = m % measuresPerSystem;
		const measuresInSystem = Math.min(
			measuresPerSystem,
			measureCount - systemIndex * measuresPerSystem,
		);
		const measureWidth = (width - 2 * x) / measuresInSystem;
		const measureX = x + posInSystem * measureWidth;
		const systemY = y + systemIndex * systemHeight;
		const isSystemStart = posInSystem === 0;
		const isSystemEnd = posInSystem === measuresInSystem - 1;
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

				// Draw this staff's notes on top of the stave. TAB notes need their own
				// glyphs (string/fret), which no roadmap case exercises yet — skip them.
				const voices = measure.voices.filter((v) => v.staff === staffNumber);
				if (!isTab && voices.length > 0) {
					const clefName = clef ? vexflowClef(clef.sign, clef.line) : 'treble';
					drawNotes(context, stave, voices, measure.beams, clefName);
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
