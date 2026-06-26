import type {
	Chord,
	Note,
	Part,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import {
	Barline,
	Bend,
	Formatter,
	type RenderContext,
	Renderer,
	Stave,
	StaveConnector,
	type StaveNote,
	type TabNote,
	TabStave,
	Vibrato,
	Voice,
} from 'vexflow';
import type { Config } from './config';
import { LABEL_GAP, type MeasureNumbering, type ScoreLayout } from './layout';
import {
	endBeatOf,
	meterBeats,
	staffVoices,
	vexflowClef,
	vexflowTabTickables,
	vexflowVoiceTickables,
} from './notes';
import {
	buildBeams,
	buildHammerPulls,
	buildSlides,
	buildSlurs,
	buildTies,
	buildTuplets,
} from './spanners';

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

// The stave connector that joins a multi-staff part's own staves, from the first
// <part-symbol> declared in any measure's attributes. brace (the MusicXML default) for
// piano grand staves; bracket for guitar notation+tab pairs; null for 'none' (no
// connector). Other values (line, square) fall back to brace.
function partSymbol(part: Part): 'brace' | 'bracket' | null {
	for (const measure of part.measures) {
		const symbol = measure.child('attributes')?.child('part-symbol')?.text;
		if (symbol) {
			if (symbol === 'none') {
				return null;
			}
			return symbol === 'bracket' ? 'bracket' : 'brace';
		}
	}
	return 'brace';
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
	meterFloor: number,
): number {
	// Floor the run-out beat at the meter so an underfull measure pads trailing
	// ghosts instead of jamming its last note against the end barline.
	const endBeat = Math.max(endBeatOf(voices), meterFloor);
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

// Draw a tablature staff's notes: each mdom voice becomes a vexflow voice of
// TabNotes (fret numbers on their strings). Tab notes carry no clef/key, no
// ghost-note gap filling, and no beams here — the roadmap cases are single-voice
// fretted lines — so this is a slimmer sibling of drawNotes. Hammer-ons/pull-offs
// span measures, so the caller resolves them once over the whole score (this only
// records each chord's TabNote in the shared `byTabLead` map).
function drawTabNotes(
	context: RenderContext,
	stave: TabStave,
	voices: ScoreVoice[],
	softmaxFactor: number,
	byTabLead: Map<Note, TabNote>,
): void {
	const vexVoices = voices.map((voice) =>
		new Voice()
			.setMode(Voice.Mode.SOFT)
			.setSoftmaxFactor(softmaxFactor)
			.addTickables(
				vexflowTabTickables(voice.chords, (lead, tabNote) =>
					byTabLead.set(lead, tabNote),
				),
			),
	);
	new Formatter({ softmaxFactor })
		.joinVoices(vexVoices)
		.formatToStave(vexVoices, stave);
	// setStave before stretching so each note's getAbsoluteX() is in true stave
	// coordinates — the stretch helpers compare it against stave.getNoteEndX(), which
	// is absolute. Voice.draw sets the stave again (idempotent). Without this, an
	// unset stave makes getAbsoluteX() stave-relative, and the last note's bend/vibrato
	// (clamped to getNoteEndX) overshoots off the page.
	for (const vexVoice of vexVoices) {
		for (const note of vexVoice.getTickables()) {
			note.setStave(stave);
		}
	}
	stretchVibratos(stave, vexVoices);
	stretchBends(stave, vexVoices);
	for (const vexVoice of vexVoices) {
		vexVoice.draw(context, stave);
	}
}

// VexFlow draws a bend arrow at a fixed ~8px width. A guitar bend reads as sliding
// into the next note, so stretch each so its arrow reaches the next note — or the
// bar's end if it's the last note (same span as stretchVibratos). The arrow draws
// from getAbsoluteX() + width + 2 + 3 (TabNote RIGHT modifier x, +3 in Bend.draw),
// mirrored here (the modifier's own x isn't positioned until draw). getAbsoluteX()
// is in stave coordinates only because drawTabNotes setStave's the notes first — else
// it's stave-relative and the last note's span to getNoteEndX overshoots off the page.
// Bend.draw uses each phrase leg's drawWidth, which is protected — hence the cast. A
// bend-and-release (UP+DOWN) peaks at the midpoint and returns, so split across legs.
function stretchBends(stave: TabStave, voices: Voice[]): void {
	for (const voice of voices) {
		const tickables = voice.getTickables() as TabNote[];
		tickables.forEach((note, i) => {
			const bend = note
				.getModifiers()
				.find((m) => m.getCategory() === Bend.CATEGORY) as Bend | undefined;
			if (!bend) {
				return;
			}
			const startX = note.getAbsoluteX() + note.getWidth() + 5;
			const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
			const width = Math.max(0, endX - startX);
			const { phrase } = bend as unknown as {
				phrase: { drawWidth?: number }[];
			};
			const [up, down] = phrase;
			if (!up) {
				return;
			}
			if (down) {
				up.drawWidth = width / 2;
				down.drawWidth = 0;
			} else {
				up.drawWidth = width;
			}
		});
	}
}

// VexFlow's Vibrato draws a fixed 20px wavy line trailing the fret. A real vibrato
// sustains for the note's full sounding length, so stretch each to span up to the
// next note — or the bar's end if it's the last note. Widths depend on the formatted
// x positions, so this runs after formatToStave: set each Vibrato's width from the
// fret's right edge to the next note's x (or the stave's note-end x). The Vibrato
// draws from getAbsoluteX() + width + 2 (TabNote.getModifierStartXY for RIGHT), mirrored
// here. Like stretchBends, this relies on drawTabNotes having setStave'd the notes so
// getAbsoluteX() is in stave coordinates and the last note's span clamps to the barline.
function stretchVibratos(stave: TabStave, voices: Voice[]): void {
	for (const voice of voices) {
		const tickables = voice.getTickables() as TabNote[];
		tickables.forEach((note, i) => {
			const vibrato = note
				.getModifiers()
				.find((m) => m.getCategory() === Vibrato.CATEGORY) as
				| Vibrato
				| undefined;
			if (!vibrato) {
				return;
			}
			const startX = note.getAbsoluteX() + note.getWidth() + 2;
			const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
			vibrato.setVibratoWidth(Math.max(0, endX - startX));
		});
	}
}

// The "TAB" glyph is sized and centered for a 6-line staff. For a shorter tab staff
// (e.g. a 4-string bass) shrink and re-center it to fit. Reaches into vexflow's clef
// modifier directly — there's no public API for this.
function resizeTabClef(stave: TabStave, tabLines: number): void {
	if (tabLines === 6) {
		return;
	}
	const [tabClef] = stave.getModifiers(undefined, 'Clef') as unknown as Array<{
		line: number;
		fontInfo: { size: number };
	}>;
	if (tabClef) {
		tabClef.fontInfo.size *= (tabLines - 1) / 5;
		tabClef.line = (tabLines - 1) / 2;
	}
}

// Whether measure at 0-based `index` (system-start or not) shows its number under
// the given mode. 'every-N' numbers every Nth measure plus every system start.
function showsMeasureNumber(
	mode: MeasureNumbering,
	index: number,
	isSystemStart: boolean,
): boolean {
	switch (mode) {
		case 'none':
			return false;
		case 'system':
			return isSystemStart;
		case 'every':
			return true;
		case 'every-2':
			return isSystemStart || index % 2 === 0;
		case 'every-3':
			return isSystemStart || index % 3 === 0;
	}
}

// Draw the whole score onto the element: one SVG stave per part-staff per measure,
// placed at the boxes computed by computeLayout, with clefs/keys/time signatures,
// notes, and the brace/barline connectors that group parts into systems.
export function drawScore(
	canvas: HTMLCanvasElement,
	parts: Part[],
	layout: ScoreLayout,
	config: Config,
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
		labelIndent,
	} = layout;
	const { measureNumbering, showTabHammerPullText, showTabSlideText } = config;

	// Canvas is immediate-mode: resizing a canvas clears its bitmap, so the final
	// page height must be known before drawing — but it's only discovered while
	// drawing (systems stack downward, deep ledger lines extend further). So draw
	// once onto an oversized offscreen canvas, then blit the used region into the
	// real canvas cropped to content. SVG could grow after drawing; canvas can't.
	const systemCount =
		boxes.reduce((n, b) => (b ? Math.max(n, b.systemIndex + 1) : n), 0) || 1;
	// ponytail: per-system slack for content below the stave (deep ledger lines);
	// bump if an extreme low tessitura ever clips at the scratch canvas bottom.
	const LEDGER_HEADROOM = 300;
	const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
	const scratchHeight = layout.top + systemCount * perSystem;

	const scratch = document.createElement('canvas');
	const renderer = new Renderer(scratch, Renderer.Backends.CANVAS);
	const context = renderer.getContext();
	renderer.resize(width, scratchHeight);

	// Part labels use the text font set on the container by loadFonts() (the only
	// reader of --vexml-font-text). Falls back to Arial if unset (e.g. SSR/no fonts).
	// Read from the real (in-DOM) canvas — the offscreen scratch has no CSS vars.
	const labelFont =
		getComputedStyle(canvas).getPropertyValue('--vexml-font-text').trim() ||
		'Arial';

	// One note map for the whole score: ties and slurs can span a barline, so their
	// two endpoints may live in different measures. Notes are drawn measure by
	// measure (recording into this map); the spanners are resolved once at the end.
	const byLead = new Map<Note, StaveNote>();
	const allChords: Chord[] = [];

	// The same arrangement for tablature staves: hammer-ons/pull-offs also span
	// barlines, so TAB notes record into their own map and resolve at the end.
	const byTabLead = new Map<Note, TabNote>();
	const allTabChords: Chord[] = [];

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
		const showMeasureNumber = showsMeasureNumber(
			measureNumbering,
			m,
			isSystemStart,
		);
		// Number is printed once per measure, above the system's top stave only.
		let measureNumbered = false;
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
				// final measure of the piece closes with a thin-thick end barline.
				// When the system has multiple staves, the per-measure stave connector
				// already draws this line across the staves, so the per-stave end barline
				// is suppressed to avoid doubling it.
				// Exception: a lone TAB stave has no system connector to close its left
				// edge, so its system-start measure draws an explicit begin barline.
				stave.setBegBarType(
					isTab && totalStaves === 1 && isSystemStart
						? Barline.type.SINGLE
						: Barline.type.NONE,
				);
				stave.setEndBarType(
					totalStaves > 1
						? Barline.type.NONE
						: isLastMeasure
							? Barline.type.END
							: Barline.type.SINGLE,
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
						const tabStave = stave as TabStave;
						tabStave.addTabGlyph();
						resizeTabClef(tabStave, tabLines);
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

				// A multi-stave part's bracket (drawn below) has a top curl that sits where
				// vexflow's setMeasure centers the measure number, so the number gets
				// occluded. Only for a bracket do we draw the number ourselves, left-aligned
				// just right of the barline and lifted above the curl; the curly brace
				// doesn't reach that high, so it keeps vexflow's placement. Top stave only.
				const numberOccluded =
					isSystemStart && staveCount > 1 && partSymbol(part) === 'bracket';
				if (showMeasureNumber && !measureNumbered && !numberOccluded) {
					stave.setMeasure(Number(measure.number));
					measureNumbered = true;
				}

				stave.setContext(context).draw();

				if (showMeasureNumber && !measureNumbered && numberOccluded) {
					context.save();
					context.setFont(stave.getFont());
					context.setFillStyle('#000000');
					context.fillText(
						measure.number,
						stave.getX() + 4,
						stave.getYForTopText(0) - 14,
					);
					context.restore();
					measureNumbered = true;
				}
				const staveBottom = stave.getBottomY();
				pageBottom = Math.max(pageBottom, staveBottom);
				systemContentBottom = Math.max(systemContentBottom, staveBottom);

				// Draw this staff's notes on top of the stave. A TAB stave draws its
				// notes as fretted TabNotes; everything else uses the notation path.
				// An empty voice (no chords) would crash the formatter, so it's filtered.
				const voices = staffVoices(measure.voices, staffNumber);
				if (isTab && voices.length > 0) {
					drawTabNotes(
						context,
						stave as TabStave,
						voices,
						softmaxFactor,
						byTabLead,
					);
					for (const voice of voices) {
						allTabChords.push(...voice.chords);
					}
				} else if (voices.length > 0) {
					const clefName = clef ? vexflowClef(clef.sign, clef.line) : 'treble';
					const noteBottom = drawNotes(
						context,
						stave,
						voices,
						measure.beams,
						clefName,
						softmaxFactor,
						byLead,
						meterBeats(measure.getTime(staffNumber)),
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

			// A part's own staves are joined at each system start by the symbol named in
			// <part-symbol> (brace by default; bracket for guitar notation+tab pairs).
			// 'none' suppresses the connector entirely.
			const symbol = partSymbol(part);
			if (partTop && partBottom && staveCount > 1 && isSystemStart && symbol) {
				new StaveConnector(partTop, partBottom)
					.setType(symbol)
					.setContext(context)
					.draw();
			}

			// Print the instrument name in the first system's reserved left indent,
			// right-aligned just before the stave and vertically centered on the part's
			// staves.
			if (
				labelIndent > 0 &&
				part.label &&
				systemIndex === 0 &&
				isSystemStart &&
				partTop &&
				partBottom
			) {
				context.save();
				context.setFont(labelFont, 13);
				const tw = context.measureText(part.label).width;
				// Center on the staff lines themselves: top line of the part's first stave
				// to bottom line of its last, so a single stave centers on its middle line
				// and a multi-stave part centers on the group. +1.5 lands the cap-height
				// visual center on cy (a plain baseline at cy sits ~2.5px low).
				const cy = (partTop.getYForLine(0) + partBottom.getBottomLineY()) / 2;
				// Right-align every label to a fixed gap before the stave, so all parts'
				// names end at the same x (the gap clears the brace on multi-stave parts).
				context.fillText(part.label, measureX - LABEL_GAP - tw, cy + 1.5);
				context.restore();
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
	// Tablature hammer-ons/pull-offs and slides, likewise resolved over the whole score.
	for (const tie of buildHammerPulls(
		allTabChords,
		byTabLead,
		showTabHammerPullText,
	)) {
		tie.setContext(context).draw();
	}
	for (const slide of buildSlides(allTabChords, byTabLead, showTabSlideText)) {
		slide.setContext(context).draw();
	}

	// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
	// system aren't clipped and there's no trailing whitespace. Sizing the real
	// canvas resets it to an identity transform, so the blit copies device pixels
	// 1:1 from the scratch's top-left; the unused bottom is simply not copied.
	const cssHeight = Math.max(floorHeight, pageBottom + 40);
	const dpr = scratch.width / parseFloat(scratch.style.width);
	canvas.width = scratch.width;
	canvas.height = Math.round(cssHeight * dpr);
	canvas.style.width = scratch.style.width;
	canvas.style.height = `${cssHeight}px`;
	canvas.getContext('2d')?.drawImage(scratch, 0, 0);
}
