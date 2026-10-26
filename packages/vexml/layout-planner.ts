import type { Measure, Part, Score } from '@stringsync/mdom';
import {
	Formatter,
	GhostNote,
	GraceNoteGroup,
	Metrics,
	type Voice,
} from 'vexflow/core';
import { Appearance } from './appearance';
import type { Config, Gap, PanoramicLayout, StandardLayout } from './config';
import {
	BASE_VOICE_WIDTH,
	DEFAULT_WIDTH,
	EPSILON,
	GAP_LABEL_FONT_SIZE,
	GRACE_SPACING,
	HEADER_GAP,
	INTER_PART_SPACING,
	INTRA_PART_SPACING,
	LABEL_CHAR_WIDTH,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	LEAD_BARLINE,
	LEAD_CLEF,
	LEAD_CLEF_CHANGE,
	LEAD_KEY,
	LEAD_TIME,
	LOG_SPACING_RATIO,
	MIN_LOG_FACTOR,
	MULTI_REST_MIN_WIDTH,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
	PAGE_MARGIN_TOP_WITH_TEMPO,
	PAGE_MARGIN_X,
	QUARTER_NOTE_TICKS,
	TAB_MIN_NOTE_SPACING,
	WORDS_CHAR_WIDTH,
} from './constants';
import type { DocumentLayout, DocumentPage, PageSize } from './document-layout';
import type { Gaps } from './gaps';
import { HeaderPlan } from './header-plan';
import type { LayoutPlan } from './layout-plan';
import { type LayoutRules, LazyLayoutPlan } from './lazy-layout-plan';
import type { ScoreReader, StaffVoice } from './score-reader';
import type { MidClefSpec, SignatureTranslator } from './signature-translator';
import { StaveFactory } from './stave-factory';
import type { StavePlan } from './stave-plan';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { VoiceTranslator } from './voice-translator';
import { WholeLayoutPlan } from './whole-layout-plan';

export class LayoutPlanner {
	constructor(
		private readonly translator: VoiceTranslator,
		private readonly tab: TabVoiceTranslator,
		private readonly signatures: SignatureTranslator,
		private readonly staves: StavePlan,
		private readonly reader: ScoreReader,
		private readonly configuredGaps: Gaps,
	) {}

	// A note's horizontal share under the logarithmic spacing curve: `noteSpacing` px at a
	// quarter note, LOG_SPACING_RATIO more/less per doubling/halving of duration, floored so
	// very short notes keep a sane share. Sub-linear in duration, so a measure's note *count*
	// drives its width far more than note *value* does.
	private noteLogWidth(ticks: number, noteSpacing: number): number {
		if (ticks <= 0) {
			return 0;
		}
		const factor =
			1 + LOG_SPACING_RATIO * Math.log2(ticks / QUARTER_NOTE_TICKS);
		return noteSpacing * Math.max(MIN_LOG_FACTOR, factor);
	}

	// The horizontal space a note's attached grace cluster needs: its preformatted width plus
	// the GRACE_SPACING lead clearance notes.ts pads before it, or 0 if it has none. Lets the
	// measure grow to hold the grace instead of compressing its real notes.
	private graceWidthOf(t: {
		getModifiers(): { getCategory(): string }[];
	}): number {
		const group = this.translator.findModifier<GraceNoteGroup>(
			t,
			GraceNoteGroup.CATEGORY,
		);
		return group ? group.getWidth() + GRACE_SPACING : 0;
	}

	// A measure's note-area widths: `ideal` is the sum of its notes' logarithmic widths (denser
	// measures get more space; a long note adds only a little), `min` is the width below which
	// vexflow's own formatter can no longer place those notes without collision. Every layout
	// decision is free to squeeze a measure between the two, and none may go below `min`: that
	// is what keeps notes from being cut off. Builds throwaway notes so the draw pass is
	// untouched. The busiest staff wins (all staves in a measure share one width).
	private measureNoteArea(
		staves: StaveSpec[],
		floor: number,
		noteSpacing: number,
		softmaxFactor: number,
	): NoteArea {
		let minNotes = 0;
		let logWidth = 0;
		for (const {
			voices,
			clef,
			meterFloor,
			isTab,
			tuning,
			barlines,
			midClefs,
		} of staves) {
			// Match drawNotes: pad underfull measures to the meter so the measured width
			// reserves the same trailing space the draw pass will leave.
			const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
			// Tab voices build TabNotes (no ghost padding), matching drawTabNotes.
			const perVoice = voices.map((voice, voiceIndex) =>
				isTab
					? this.tab.tickables(voice.chords, tuning)
					: this.translator.tickables(voice.chords, clef, {
							endBeat,
							run: voice.run,
							// Matches buildNotes: the dividers and clef glyphs ride on the first
							// voice only, but the clef changes re-aim every voice's notes.
							barlines: voiceIndex === 0 ? barlines : [],
							midClefs,
							drawMidClefs: voiceIndex === 0,
						}),
			);
			const vexVoices = perVoice.map((tickables) =>
				this.translator.softVoice(tickables, softmaxFactor),
			);
			if (vexVoices.length === 0) {
				continue;
			}
			minNotes = Math.max(
				minNotes,
				this.minNoteWidth(vexVoices, softmaxFactor),
			);
			// Floor a tab measure's width by its note count so dense rhythms stay legible.
			if (isTab) {
				const noteCount = Math.max(0, ...perVoice.map((t) => t.length));
				minNotes = Math.max(minNotes, noteCount * TAB_MIN_NOTE_SPACING);
			}
			// Sum each voice's per-note logarithmic widths; the busiest voice sets the width.
			// Grace notes steal no time, so they get no logarithmic share, but they still
			// occupy horizontal space left of their host. Add each grace cluster's width on top
			// so a grace-bearing measure is allocated the extra room it needs, instead of the
			// graces compressing the real notes into the same width (see graceWidthOf).
			for (const tickables of perVoice) {
				let w = 0;
				for (const t of tickables) {
					w +=
						this.noteLogWidth(t.getTicks().value(), noteSpacing) +
						this.graceWidthOf(t);
				}
				logWidth = Math.max(logWidth, w);
			}
		}
		const min = Math.max(floor, minNotes);
		return { min, ideal: Math.max(min, logWidth) };
	}

	/*
	 * A measure's note area estimated from its beats alone, no vexflow built: each voice's
	 * notes' logarithmic widths with the trailing room drawNotes pads an underfull voice to the
	 * meter with, a grace's lead clearance per grace, the busiest voice wins, and a tab measure
	 * floored by its note count as above. Blind to vexflow's collision minimum, which decides
	 * most of a dense measure's width, so a plan scales it by what its measured measures showed
	 * (see LazyLayoutPlan.forecast). Only a forecast reads it: the layout is measureNoteArea's.
	 */
	private estimateNoteArea(
		staves: StaveSpec[],
		floor: number,
		noteSpacing: number,
	): NoteArea {
		let logWidth = 0;
		for (const { voices, meterFloor, isTab } of staves) {
			const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
			for (const voice of voices) {
				let w = 0;
				let last = 0;
				let count = 0;
				for (const chord of voice.chords) {
					if (chord.lead.isGrace) {
						w += GRACE_SPACING;
						continue;
					}
					const beat = this.reader.measureBeatOf(chord.lead) ?? 0;
					const beats = this.reader.beatsOf(chord.lead) ?? 0;
					w += this.noteLogWidth(beats * QUARTER_NOTE_TICKS, noteSpacing);
					last = Math.max(last, beat + beats);
					count++;
				}
				if (endBeat > last + EPSILON) {
					w += this.noteLogWidth(
						(endBeat - last) * QUARTER_NOTE_TICKS,
						noteSpacing,
					);
				}
				if (isTab) {
					w = Math.max(w, count * TAB_MIN_NOTE_SPACING);
				}
				logWidth = Math.max(logWidth, w);
			}
		}
		return { min: floor, ideal: Math.max(floor, logWidth) };
	}

	/*
	 * The narrowest a stave's voices fit without crowding: vexflow's
	 * preCalculateMinTotalWidth, with its spread padding measured on the notes a reader sees.
	 *
	 * vexflow pads the contexts' summed widths by the larger of two terms: its unaligned-note
	 * padding for each context only some voices sound in, or the spread (coefficient of
	 * variation) of the notes' widths and durations times the context count. That spread
	 * runs away on two things the notes never need room for: the zero-width ghosts that
	 * stand in for a cross-staff run's notes on the other stave, and one long held note in
	 * another voice under a fast run, pooled into a single duration sample. Together they
	 * asked Der Lindenbaum's bar 51 for 678px where its notes fit in about 400. So the spread
	 * skips ghosts, and duration spread is taken within each voice (the busiest wins). A
	 * single voice with no ghosts gets vexflow's own number.
	 */
	private minNoteWidth(voices: Voice[], softmaxFactor: number): number {
		const formatter = new Formatter({ softmaxFactor }).joinVoices(voices);
		formatter.preCalculateMinTotalWidth(voices);
		const contexts = formatter.getTickContexts();
		const ticks = contexts?.list ?? [];
		let unaligned = 0;
		for (const tick of ticks) {
			if ((contexts?.map[tick]?.getTickables().length ?? 0) < voices.length) {
				unaligned += 1;
			}
		}
		// Coefficient of variation, as vexflow computes it (population deviation over mean).
		const spread = (values: number[]) => {
			if (values.length === 0) {
				return 0;
			}
			const mean = values.reduce((a, b) => a + b, 0) / values.length;
			const variance =
				values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
			return mean > 0 ? Math.sqrt(variance) / mean : 0;
		};
		const seen = voices.map((voice) =>
			voice.getTickables().filter((t) => !(t instanceof GhostNote)),
		);
		const widths = seen.flat().map((t) => t.getMetrics().width);
		const durations = Math.max(
			0,
			...seen.map((ts) => spread(ts.map((t) => t.getTicks().value()))),
		);
		const padding = Metrics.get('Stave.unalignedNotePadding');
		return (
			formatter.getMinTotalWidth() +
			Math.max(
				unaligned * padding,
				Math.max(spread(widths), durations) * ticks.length * padding,
			)
		);
	}

	// The width a gap's label needs, padded on both sides; 0 for an unlabeled gap.
	// ponytail: estimated from the part-label ~7.5px/char@13px ratio, scaled to the gap's
	// font size; measure exactly if a font change drifts.
	private gapLabelWidth(gap: Gap): number {
		if (!gap.label) {
			return 0;
		}
		const fontSize = gap.style?.fontSize ?? GAP_LABEL_FONT_SIZE;
		return (
			gap.label.length * LABEL_CHAR_WIDTH * (fontSize / LABEL_FONT_SIZE) +
			2 * LABEL_GAP
		);
	}

	/*
	 * Space to hold open before a measure's right barline, so a words directive on the measure's
	 * LAST note fits inside the measure instead of printing across the divider. The directive is
	 * left-anchored at its note's x (see DrawPass.drawWords), and the last note has nothing after
	 * it, so the only room the text has is that note's own share of the width; anything longer
	 * spills over the barline. A directive anchored earlier prints over the notes that follow it,
	 * which is ordinary engraving and needs no room of its own.
	 *
	 * Reserved as a pad rather than as extra note area: stretching the note area feeds most of
	 * the growth to the earlier notes and the anchor slides right along with the barline, so the
	 * overhang barely closes. The pad sits outside what the formatter justifies into, which puts
	 * the space where the text actually needs it.
	 */
	private trailingWordsPad(measures: Measure[], noteSpacing: number): number {
		// The column's last onset, across every part, voice and staff: the whole column is
		// formatted together, so a note in ANY part is room a directive can print over.
		// Compared against onsets rather than against the column's end beat, so a whole-measure
		// rest (which ENDS last but starts at beat 0) isn't mistaken for a note at the barline.
		const words = measures.flatMap((measure) => this.reader.wordsOf(measure));
		if (words.length === 0) {
			return 0;
		}
		let lastOnset = 0;
		for (const measure of measures) {
			for (const voice of this.reader.voicesOf(measure)) {
				for (const chord of voice.chords) {
					lastOnset = Math.max(
						lastOnset,
						this.reader.measureBeatOf(chord.lead) ?? 0,
					);
				}
			}
		}
		let pad = 0;
		for (const { text, lead, format } of words) {
			// A directive naming no note anchors at the measure's first one instead.
			if (
				!lead ||
				(this.reader.measureBeatOf(lead) ?? 0) + EPSILON < lastOnset
			) {
				continue;
			}
			const room = this.noteLogWidth(
				(this.reader.beatsOf(lead) ?? 0) * QUARTER_NOTE_TICKS,
				noteSpacing,
			);
			pad = Math.max(pad, text.length * WORDS_CHAR_WIDTH * format.scale - room);
		}
		return Math.max(0, pad);
	}

	/*
	 * The mirror of {@link trailingWordsPad}: space to hold open after a measure's LEFT barline.
	 * A directive on a TAB note is drawn CENTERED on it (see DrawPass.drawAnnotations), so one on
	 * the measure's first note reaches half its width backwards, across the divider: the notes
	 * before it are in the previous measure and are no room at all. Half the text is what has to
	 * fit; the caller nets off the lead glyphs, which already hold the front of the measure open.
	 *
	 * Only tab-anchored directives count. A notation-stave one is left-anchored at its notehead
	 * and reaches only forward, so it needs nothing here.
	 */
	private leadingWordsPad(parts: Part[], m: number): number {
		// The column's first onset, across every part, voice and staff, matching the last-onset
		// read in trailingWordsPad, so "anchored at the measure's first note" means the same
		// thing on both sides even when one part rests through the downbeat.
		const words = parts.flatMap((part) => {
			const measure = part.measures[m];
			return measure
				? this.reader.wordsOf(measure).map((w) => ({ part, ...w }))
				: [];
		});
		if (words.length === 0) {
			return 0;
		}
		let firstOnset = Number.POSITIVE_INFINITY;
		for (const part of parts) {
			const measure = part.measures[m];
			for (const voice of measure ? this.reader.voicesOf(measure) : []) {
				for (const chord of voice.chords) {
					firstOnset = Math.min(
						firstOnset,
						this.reader.measureBeatOf(chord.lead) ?? 0,
					);
				}
			}
		}
		let pad = 0;
		for (const { part, text, staffNumber, lead, closesBar, format } of words) {
			// A directive naming no note anchors at the measure's first one instead, unless
			// it closes the bar, which ends at the right barline instead.
			if (
				closesBar ||
				(lead && (this.reader.measureBeatOf(lead) ?? 0) > firstOnset + EPSILON)
			) {
				continue;
			}
			if (!this.staves.isTab(part, staffNumber)) {
				continue;
			}
			pad = Math.max(pad, (text.length * WORDS_CHAR_WIDTH * format.scale) / 2);
		}
		return pad;
	}

	/*
	 * The page a paged layout fits its systems onto: the document's when documentLayout
	 * found one, else the config's. Null for any other layout.
	 */
	private pageOf(
		config: Config,
		documentPage: DocumentPage | null,
	): PageFrame | null {
		const layout = config.layout;
		if (layout.type !== 'paged') {
			return null;
		}
		if (documentPage) {
			return {
				width: documentPage.width,
				height: documentPage.height ?? layout.pageHeight,
				marginTop: documentPage.margins.top,
				marginBottom: documentPage.margins.bottom,
				// The planner lays the page out at the document's own margins.
				offsetX: 0,
				evenShift: documentPage.evenShift,
			};
		}
		return {
			width: layout.pageWidth,
			height: layout.pageHeight,
			marginTop: layout.margin,
			marginBottom: layout.margin,
			// Laid out with PAGE_MARGIN_X at the sides, then shifted onto the page's margin.
			offsetX: layout.margin - PAGE_MARGIN_X,
			evenShift: 0,
		};
	}

	/*
	 * The layout systems flow in. A paged layout flows like a standard one whose reference width
	 * puts the staves exactly between the page's side margins; the drawer fits its systems onto
	 * pages afterwards. The document's page does the same for a standard layout.
	 */
	private flowOf(
		config: Config,
		page: PageFrame | null,
		documentPage: DocumentPage | null,
	): StandardLayout | PanoramicLayout {
		const layout = config.layout;
		if (layout.type === 'paged') {
			return {
				type: 'standard',
				referenceWidth: page ? page.width - 2 * page.offsetX : 0,
				honorSystemBreaks: layout.honorSystemBreaks,
				documentLayout: layout.documentLayout,
				overflow: layout.overflow,
			};
		}
		if (documentPage && layout.type === 'standard') {
			return { ...layout, referenceWidth: documentPage.width };
		}
		return layout;
	}

	/*
	 * What the document says of each system's height: stave offsets with each gap the
	 * document sets measured from the upper stave's bottom line to the lower one's top line
	 * (a gap it leaves out keeps the planned one), and the distances above the system. Read off
	 * the system's first measure, which the document's `<print>` would lead.
	 */
	private documentSystems(
		parts: Part[],
		systems: readonly (readonly number[])[],
		planned: number[],
		document: DocumentLayout,
		strict: boolean,
	): (DocumentSystem & { staveOffsets: number[] })[] {
		const factory = new StaveFactory(this.signatures, this.staves);
		const rows = parts.flatMap((part, partIndex) =>
			this.staves
				.visibleNumbers(part)
				.map((staffNumber) => ({ part, partIndex, staffNumber })),
		);
		return systems.map((measures) => {
			const first = measures[0] ?? 0;
			// Each row's staff lines relative to its stave's y, as the draw pass will build it.
			const lines = rows.map(({ part, staffNumber }) => {
				const measure = part.measures[first];
				if (!measure) {
					return null;
				}
				const { stave } = factory.create(part, measure, staffNumber, 0, 0, 0);
				return { top: stave.getYForLine(0), bottom: stave.getBottomLineY() };
			});
			const staveOffsets = [planned[0] ?? 0];
			const fixedGaps = [false];
			for (let r = 1; r < rows.length; r++) {
				const row = rows[r];
				const above = lines[r - 1];
				const below = lines[r];
				const distance = row
					? document.staffDistance(first, row.partIndex, row.staffNumber)
					: null;
				const set = distance !== null && above !== null && below !== null;
				const gap =
					set && above && below
						? above.bottom + (distance ?? 0) - below.top
						: (planned[r] ?? 0) - (planned[r - 1] ?? 0);
				staveOffsets.push((staveOffsets.at(-1) ?? 0) + gap);
				fixedGaps.push(strict && set);
			}
			return {
				staveOffsets,
				systemDistance: document.systemDistance(first),
				topSystemDistance: document.topSystemDistance(first),
				lineTop: lines[0]?.top ?? 0,
				startsPage: document.startsPage(first),
				blankPages: document.blankPages(first),
				page: document.pageSize(first),
				strict,
				fixedGaps,
			};
		});
	}

	/** Lay the parts out at the reference width: where every measure box sits, how
	 * staves stack within a system, and how tall/wide the page starts. Depends only on
	 * the music and the options, never on the live container: the finished result is
	 * scaled to fit its container. */
	plan(score: Score, config: Config): ScoreLayout {
		return this.begin(score, config).complete();
	}

	/**
	 * Begin the layout `plan` makes, to place a system at a time (see LayoutPlan): the systems
	 * the first screen of a progressive render needs before the rest of the score is measured.
	 * The plan comes complete where it rests on the whole score: a panoramic line, an
	 * `overflow: 'widen'` page, and a layout following the document's own.
	 */
	begin(score: Score, config: Config): LayoutPlan {
		const parts = score.parts;
		// documentLayout: the page, system and staff layout the document asks for. Null when
		// ignored, which leaves every number below exactly as vexml's own.
		const mode =
			config.layout.type === 'panoramic'
				? 'ignore'
				: config.layout.documentLayout;
		const document =
			mode === 'ignore' ? null : this.reader.documentLayoutOf(score);
		const documentPage = document?.page() ?? null;
		const appearance =
			mode === 'ignore' ? Appearance.NONE : this.reader.appearanceOf(score);
		// The glyphs the document swaps in change what the notes and clefs measure, so the
		// translators the layout and draw passes share take them before anything is measured.
		this.translator.useAppearance(appearance);
		this.signatures.useAppearance(appearance);
		const page = this.pageOf(config, documentPage);
		const layout = this.flowOf(config, page, documentPage);
		const layoutMode = layout.type;
		// Standard lays out at its reference width; panoramic starts there and grows the page
		// to fit its single system. Not const: an overflow: 'widen' layout raises it below,
		// once the breaker has shown how wide the music actually needs the page to be.
		let width =
			layout.type === 'standard' ? layout.referenceWidth : DEFAULT_WIDTH;
		// Panoramic has no wrapping to honor breaks in and grows the page to its content, so
		// it reads as 'allow' with breaks off; neither is consulted outside standard.
		const overflow = layout.type === 'standard' ? layout.overflow : 'allow';
		const honorSystemBreaks =
			layout.type === 'standard' && layout.honorSystemBreaks;
		const noteSpacing = config.noteSpacing;
		const softmaxFactor = config.softmaxFactor;

		// Measures lay left-to-right; every part's staves stack vertically down the page.
		// Staves within a part sit further apart than the gap between parts, so a
		// brace-joined group reads as one instrument. The left margin leaves room for the
		// brace/bracket, which draw left of the stave's x.
		// The document's page margins, when it sets a page, stand in for vexml's own. A paged
		// layout without one keeps PAGE_MARGIN_X here and shifts the drawing onto its page.
		const x = documentPage?.margins.left ?? PAGE_MARGIN_X;
		// A paged layout lays every system out to fit the narrower of the odd and even pages.
		const right =
			documentPage && page
				? documentPage.margins.right + documentPage.evenNarrowing
				: (documentPage?.margins.right ?? PAGE_MARGIN_X);
		// A metronome mark on the first measure sits above the top staff, so give the
		// first system extra headroom when one is present (and room to lift the mark
		// clear of a high first note). Without a tempo the top margin is unchanged.
		// Gap measures carry no directions, so a leading gap defers to the first real
		// measure (whose mark still prints on the first system).
		const gaps = this.configuredGaps.byMeasureIndex();
		const hasTopTempo = parts.some((part) => {
			const measure = part.measures.find((_, m) => !gaps.has(m));
			return (
				measure &&
				(this.reader.tempoOf(measure) || this.reader.modulationOf(measure))
			);
		});
		// The score header (showHeader) stacks above the first system, so it moves down by the
		// header's height and the gap under it; the draw pass hangs the header off its ink.
		const header = HeaderPlan.of(config, this.reader.headerOf(score));
		const y =
			(hasTopTempo ? PAGE_MARGIN_TOP_WITH_TEMPO : PAGE_MARGIN_TOP) +
			(header && header.height(width) > 0
				? header.height(width) + HEADER_GAP
				: 0);
		const measureCount = Math.max(
			1,
			...parts.map((part) => part.measures.length),
		);
		// Every stave count here goes through the StavePlan, so layout iterates the same
		// visible staves the draw pass does and their offsets stay aligned.
		const totalStaves = parts.reduce(
			(sum, part) => sum + this.staves.visibleNumbers(part).length,
			0,
		);
		// Precompute each stave's y-offset within a system: a within-part gap after
		// every stave except a part's last, which gets the smaller inter-part gap.
		const staveOffsets: number[] = [];
		let offset = 0;
		for (const part of parts) {
			const staves = this.staves.visibleNumbers(part);
			// The wider within-part gap exists so a connector-joined group reads as one
			// instrument. A part whose staves carry no connector (two tab staves, an
			// explicit <part-symbol>none) isn't such a group, so its staves sit at the
			// same even pitch as the parts around them.
			const intra = this.staves.symbolOf(part)
				? INTRA_PART_SPACING
				: INTER_PART_SPACING;
			staves.forEach((_, s) => {
				staveOffsets.push(offset);
				offset += s === staves.length - 1 ? INTER_PART_SPACING : intra;
			});
		}

		// The first system indents to make room for the part labels printed left of the
		// staves; later systems have none. 0 when nothing is labelled. Sized to the
		// widest label plus LABEL_GAP so labels right-align just before the stave and the
		// longest still fits inside the margin without clipping.
		// ponytail: label width estimated at ~7.5px/char for 13px Arial (no render context
		// here to measure), a hair over the ~6.9px actual, so the longest never clips its
		// left edge. Measure exactly if a font change makes the estimate drift.
		const labelChars = config.showPartLabels
			? Math.max(
					0,
					...parts.map(
						(part) => this.reader.partLabels(part).name?.length ?? 0,
					),
				)
			: 0;
		const partLabelIndent =
			labelChars > 0 ? labelChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0;
		// A <group-name> prints outside the part labels: it names the section the bracket
		// spans, so it can't sit between a part's name and that part's stave. It gets its own
		// column of the indent, sized the same way.
		const groupChars = config.showPartLabels
			? Math.max(
					0,
					...this.reader
						.partGroups(score)
						.map((group) => group.name?.length ?? 0),
				)
			: 0;
		const labelIndent =
			partLabelIndent +
			(groupChars > 0 ? groupChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0);
		// Systems after the first carry the abbreviations instead, in the same two columns.
		const abbreviationChars = config.showPartLabels
			? Math.max(
					0,
					...parts.map(
						(part) => this.reader.partLabels(part).abbreviation?.length ?? 0,
					),
				)
			: 0;
		const groupAbbreviationChars = config.showPartLabels
			? Math.max(
					0,
					...this.reader
						.partGroups(score)
						.map((group) => group.abbreviation?.length ?? 0),
				)
			: 0;
		const abbreviationIndent =
			abbreviationChars > 0
				? abbreviationChars * LABEL_CHAR_WIDTH + LABEL_GAP
				: 0;
		const laterLabelIndent =
			abbreviationIndent +
			(groupAbbreviationChars > 0
				? groupAbbreviationChars * LABEL_CHAR_WIDTH + LABEL_GAP
				: 0);
		// A system the document indents by its <system-margins> gives its labels that room,
		// widened only when the labels need more. `first` is the system's first measure.
		const indentOf = (systemIndex: number, first: number) =>
			Math.max(
				systemIndex === 0 ? labelIndent : laterLabelIndent,
				document?.systemMargins(first).left ?? 0,
			);
		const rightIndentOf = (first: number) =>
			document?.systemMargins(first).right ?? 0;
		// Reads `width` at call time, so re-running the breaker after 'widen' raises it sees
		// the wider page.
		const usableOf = (systemIndex: number, first: number) =>
			width - x - right - indentOf(systemIndex, first) - rightIndentOf(first);

		// --- Edge gaps -----------------------------------------------------------------
		// A gap before the first measure of music or after the last is an edge gap: a fixed box
		// outside the staves rather than a measure on them. The system's bracket, clef and
		// signatures open on the first measure of music instead, so the box sits left of the
		// bracket; the final barline closes the last, so the box sits right of it. A score of
		// nothing but gaps has no music to stand outside of, so its gaps stay on the staves.
		const music = Array.from({ length: measureCount }, (_, m) => m).filter(
			(m) => !gaps.has(m),
		);
		const firstMusic = music[0];
		const lastMusic = music[music.length - 1];
		const edgeOf = (m: number): MeasureBox['edge'] => {
			if (firstMusic === undefined || lastMusic === undefined) {
				return null;
			}
			if (m < firstMusic) {
				return 'leading';
			}
			return m > lastMusic ? 'trailing' : null;
		};
		const isMusic = (m: number) => edgeOf(m) === null;
		// The edge box's width: the label has to fit, and the caller's minWidth is honored
		// exactly, since an edge box never stretches or squeezes with the music.
		const edgeWidthOf = (m: number) => {
			const gap = gaps.get(m);
			return gap ? Math.max(this.gapLabelWidth(gap), gap.minWidth ?? 0) : 0;
		};
		// The last leading box butts against whatever opens the system: the part labels, or
		// the bracket/brace reaching left of the staves, whichever is wider. That room replaces
		// the first system's label indent, so it counts here only by what it adds to it.
		const systemOverhang = this.staves.systemOverhang(parts);
		const lastLeading = firstMusic === undefined ? -1 : firstMusic - 1;
		const edgeLeadOf = (m: number) =>
			edgeWidthOf(m) +
			(m === lastLeading ? Math.max(0, systemOverhang - labelIndent) : 0);
		// Index of a system's first and last measure of music, which open and close it.
		const _musicStartOf = (measures: number[]) =>
			Math.max(0, measures.findIndex(isMusic));
		const _musicEndOf = (measures: number[]) => {
			const i = measures.findLastIndex(isMusic);
			return i === -1 ? measures.length - 1 : i;
		};

		// --- Spacing (content only) ---------------------------------------------------
		// A measure's note area is a pure function of its music: an `ideal` width (the sum of its
		// notes' logarithmic widths: noteSpacing per quarter, sub-linear in duration) and a `min`
		// width (vexflow's collision-free minimum, floored at BASE_VOICE_WIDTH). More notes mean a
		// wider measure; a long note adds only a little, so identical content is identically wide
		// everywhere.
		// The measures a <multiple-rest> swallows get no box at all, so they take no width, force
		// no break, and are skipped by the draw pass: the run's lead measure stands for all of
		// them (see ScoreReader.multiRestsOf).
		const { leads: multiRestLeads, hidden: multiRestHidden } =
			this.reader.multiRestsOf(parts);
		// A gap has no notes to size it: floor its (empty) note area at the caller's minWidth and
		// at the label's estimated width so the text fits. It stretches with its system like any
		// measure: minWidth is a floor, not an exact width. The label has to fit, so it sets the
		// gap's hard minimum; the caller's minWidth is a preference, so it only raises the ideal
		// and squeezes away like note spacing.
		const gapAreaOf = (gap: Gap): NoteArea => {
			const min = Math.max(BASE_VOICE_WIDTH, this.gapLabelWidth(gap));
			return { min, ideal: Math.max(min, gap.minWidth ?? 0) };
		};
		const staveSpecsOf = (m: number): StaveSpec[] => {
			const staves: StaveSpec[] = [];
			for (const part of parts) {
				const measure = part.measures[m];
				if (!measure) {
					continue;
				}
				for (const staffNumber of this.staves.visibleNumbers(part)) {
					const clef = measure.getClef(staffNumber);
					const voices = this.reader.staffVoices(measure, staffNumber);
					if (voices.length > 0) {
						staves.push({
							voices,
							clef: clef ? this.signatures.clefName(clef) : 'treble',
							meterFloor: this.reader.meterFloor(measure, staffNumber),
							isTab: this.staves.isTab(part, staffNumber),
							tuning: this.staves.tuningOf(part, staffNumber),
							barlines: this.reader.midBarlinesOf(measure),
							midClefs: this.signatures.midClefSpecs(
								this.reader.midClefsOf(measure, staffNumber),
							),
						});
					}
				}
			}
			return staves;
		};
		// A multirest lead holds one whole rest, which would size it like any empty bar: floor it
		// so the consolidated bar and its count have room to read as a multirest.
		const floorOf = (m: number) =>
			multiRestLeads.has(m) ? MULTI_REST_MIN_WIDTH : BASE_VOICE_WIDTH;
		// What a rule reads off the document for measure `m`, read once: the forecast asks again
		// for every measure past the draw after each system (see LazyLayoutPlan.forecast).
		const perMeasure = <T>(read: (m: number) => T) => {
			const values = new Map<number, T>();
			return (m: number): T => {
				if (!values.has(m)) {
					values.set(m, read(m));
				}
				return values.get(m) as T;
			};
		};
		// Measured once each, when the plan reaches the measure: building a measure's tickables is
		// most of the plan's cost, so a plan made a system at a time measures only what it places
		// (see LazyLayoutPlan). A measure past the end of a short part falls back to an empty bar.
		const memoized = (measure: (m: number) => NoteArea) => {
			const areas = new Map<number, NoteArea>();
			return (m: number): NoteArea => {
				let area = areas.get(m);
				if (!area) {
					const gap = gaps.get(m);
					// An edge gap's box is all lead (see edgeLeadOf): nothing to stretch.
					if (!isMusic(m)) {
						area = { min: 0, ideal: 0 };
					} else if (gap) {
						area = gapAreaOf(gap);
					} else {
						area = measure(m);
					}
					areas.set(m, area);
				}
				return area;
			};
		};
		const measuredAreaOf = memoized((m) =>
			this.measureNoteArea(
				staveSpecsOf(m),
				floorOf(m),
				noteSpacing,
				softmaxFactor,
			),
		);
		// The same, estimated from the beats alone (see estimateNoteArea), for the forecast of
		// the measures the plan has not reached.
		const estimateOf = memoized((m) =>
			this.estimateNoteArea(staveSpecsOf(m), floorOf(m), noteSpacing),
		);
		// Following the document, a measure the document gives a width takes it, fixed: the
		// requested width less its lead (so a system-starting measure's clef and key come out of
		// it), never narrower than its collision-free minimum unless strict.
		const documentWidthOf = perMeasure((m): number | null => {
			const widths =
				mode === 'ignore' || gaps.has(m)
					? []
					: parts.flatMap((part) => {
							const measure = part.measures[m];
							const width = measure
								? this.reader.measureWidthOf(measure)
								: null;
							return width === null ? [] : [width];
						});
			return widths.length === 0 ? null : Math.max(...widths);
		});
		const areaOf = (m: number, systemStart = false): NoteArea => {
			const area = measuredAreaOf(m);
			const documentWidth = documentWidthOf(m);
			if (documentWidth === null) {
				return area;
			}
			const requested = documentWidth - leadOf(m, systemStart);
			const width =
				mode === 'strict' ? requested : Math.max(area.min, requested);
			return { min: width, ideal: width, fixed: true };
		};

		// Room held open before the right barline for a directive on the measure's last note
		// (see trailingWordsPad). Budgeted alongside the leads: fixed either way, never
		// stretched or squeezed, so the text keeps its room at any system width.
		const pads = Array.from({ length: measureCount }, (_, m) =>
			gaps.has(m)
				? 0
				: this.trailingWordsPad(
						parts.flatMap((part) => part.measures[m] ?? []),
						noteSpacing,
					),
		);
		const padOf = (m: number) => pads[m] ?? 0;

		// The same for the front of the measure (see leadingWordsPad).
		const leadingPads = Array.from({ length: measureCount }, (_, m) =>
			gaps.has(m) ? 0 : this.leadingWordsPad(parts, m),
		);

		// Lead = glyphs a stave prints before its notes. Clef (+ key, when present)
		// repeats at every system start; the time signature prints once at the piece
		// start; mid-system measures carry only a barline, plus a smaller clef when the
		// clef changes there (draw's buildStave redraws it: budget the room or the
		// change clef eats into the note area).
		// ponytail: fixed, deliberately generous estimates so notes never collide with
		// the glyphs; measure stave.getNoteStartX() if exact alignment is ever needed.
		const leadFull = perMeasure((m) => {
			// Per STAVE, not per part: the staves of one part can carry different keys
			// (staves_different_keys), so a part whose first stave is in C still needs the
			// key's width budgeted when its second stave is not.
			const hasKey = parts.some((part) =>
				this.staves
					.visibleNumbers(part)
					.some(
						(staffNumber) =>
							this.reader.keyIdentity(
								part.measures[m]?.getKey(staffNumber) ?? null,
							) !== null,
					),
			);
			return (
				LEAD_BARLINE +
				LEAD_CLEF +
				(hasKey ? LEAD_KEY : 0) +
				(m === (firstMusic ?? 0) ? LEAD_TIME : 0)
			);
		});
		const clefChangesAt = perMeasure(
			(m) =>
				m > 0 &&
				parts.some((part) =>
					this.staves.visibleNumbers(part).some(
						(staffNumber) =>
							!this.staves.isTab(part, staffNumber) &&
							this.signatures.vexflowClefSpec(
								part.measures[m]?.getClef(staffNumber) ?? null,
							) !==
								this.signatures.vexflowClefSpec(
									// End of the previous measure, matching buildStave: a change
									// stated inside it is not restated at this barline.
									this.reader.clefAtEndOf(part.measures[m - 1], staffNumber),
								),
					),
				),
		);
		// The measure's fixed width: everything that isn't note area. Lead glyphs at the front,
		// trailing-directive room at the back.
		const leadGlyphs = (m: number, systemStart: boolean) =>
			systemStart
				? leadFull(m)
				: LEAD_BARLINE + (clefChangesAt(m) ? LEAD_CLEF_CHANGE : 0);
		// A leading directive prints over the lead glyphs' room, so only the part of it those
		// glyphs don't already cover is reserved: a measure opening with a clef and a key
		// usually needs nothing extra.
		const leadingPadOf = (m: number, systemStart: boolean) =>
			Math.max(0, (leadingPads[m] ?? 0) - leadGlyphs(m, systemStart));
		const leadOf = (m: number, systemStart: boolean) =>
			isMusic(m)
				? leadGlyphs(m, systemStart) + padOf(m) + leadingPadOf(m, systemStart)
				: edgeLeadOf(m);

		// A system's width at each of the two note-area sizes, for 'widen' below: `ideal` is what
		// it wants. Leads are fixed glyph widths.
		const spanOf = (measures: readonly number[]) =>
			measures.reduce(
				(sum, m, i) =>
					sum +
					leadOf(m, i === Math.max(0, measures.findIndex(isMusic))) +
					areaOf(m, i === Math.max(0, measures.findIndex(isMusic))).ideal,
				0,
			);

		// --- Breaks and placement -----------------------------------------------------
		// The plan breaks the measures into systems and places them, a system at a time or whole
		// (see LazyLayoutPlan); the rules are everything above, read per measure.
		const rules: LayoutRules = {
			layoutMode,
			overflow,
			strict: mode === 'strict',
			maxSystemFill: config.maxSystemFill,
			minLastSystemFill: config.minLastSystemFill,
			stretchSingleSystem: config.stretchSingleSystem,
			// Read at call time, so re-running the plan after 'widen' raises it sees the wider page.
			get width() {
				return width;
			},
			measureCount,
			hidden: multiRestHidden,
			left: x,
			right,
			lastLeading,
			labelIndent,
			systemOverhang,
			base: {
				measureCount,
				totalStaves,
				staveOffsets,
				top: y,
				systemGap: config.systemSpacing,
				appearance,
				page,
				floorHeight: y + offset + PAGE_MARGIN_BOTTOM,
				softmaxFactor,
				labelIndent,
				partLabelIndent,
				laterLabelIndent,
				abbreviationIndent,
			},
			// A <print new-system="yes"/> forces a break before the measure regardless of width,
			// unless honorSystemBreaks is off. So does a new page: its first measure necessarily
			// starts a system, whether or not the exporter also said so.
			printOf: perMeasure((m) => {
				const print = parts.map((part) => part.measures[m]?.print);
				return {
					forcedBreak:
						honorSystemBreaks && print.some((p) => p?.newSystem || p?.newPage),
					keepsLine:
						honorSystemBreaks && print.some((p) => p?.systemBreak === 'no'),
				};
			}),
			isMusic,
			edgeOf,
			edgeWidthOf,
			areaOf,
			estimateOf,
			leadOf,
			padOf,
			leadingPadOf,
			indentOf,
			rightIndentOf,
			usableOf,
		};
		// Planned whole when the plan rests on what only the whole score tells: a panoramic line
		// is one system, 'widen' re-breaks everything at the width the systems ask for, and a
		// layout following the document sizes its page by its deepest system.
		if (layoutMode !== 'panoramic' && overflow !== 'widen' && !document) {
			return new LazyLayoutPlan(rules);
		}
		let plan = new LazyLayoutPlan(rules);
		plan.complete();

		// 'widen': grow the page until every system fits at its ideal spacing, then re-break
		// at the new width. Widening only ever removes wraps, and a system the breaker itself
		// ended is already bounded by maxSystemFill, so each pass leaves less to fix than the
		// last and this settles: two passes for a typical score.
		// ponytail: capped at 4 passes rather than proving convergence; the loop exits early
		// on the pass that needs no growth, so the cap only bites on pathological input.
		if (overflow === 'widen') {
			for (let pass = 0; pass < 4; pass++) {
				const needed = Math.max(
					width,
					...plan
						.systemMeasures()
						.map(
							(measures, systemIndex) =>
								spanOf(measures) +
								x +
								right +
								indentOf(systemIndex, measures[0] ?? 0) +
								rightIndentOf(measures[0] ?? 0),
						),
				);
				if (needed <= width) {
					break;
				}
				width = needed;
				plan = new LazyLayoutPlan(rules);
				plan.complete();
			}
		}

		const planned = plan.complete();
		// The document's vertical layout, per system: its stave gaps and the distance above it.
		if (document) {
			const documentSystems = this.documentSystems(
				parts,
				plan.systemMeasures(),
				staveOffsets,
				document,
				mode === 'strict',
			);
			planned.systemStaveOffsets = new Map(
				documentSystems.map((system, s) => [s, system.staveOffsets]),
			);
			planned.documentSystems = documentSystems.map(
				({ staveOffsets: _, ...system }) => system,
			);
			// The deepest system sets the floor: the trailing gap the planned offsets end on,
			// past the last stave of whichever system reaches furthest down.
			const lastPlanned = staveOffsets.at(-1) ?? 0;
			const deepest = Math.max(
				lastPlanned,
				...documentSystems.map((system) => system.staveOffsets.at(-1) ?? 0),
			);
			planned.floorHeight =
				y + offset + (deepest - lastPlanned) + PAGE_MARGIN_BOTTOM;
		}
		return new WholeLayoutPlan(planned);
	}
}

/** What the document says sits above one system, in px (see LayoutPlanner.documentSystems). */
export type DocumentSystem = {
	/** From the bottom line of the system above to this one's top line; null when unset. */
	systemDistance: number | null;
	/** From the page's top margin to this system's top line, when it opens a page. */
	topSystemDistance: number | null;
	/** The top stave's top line, relative to the stave's y. */
	lineTop: number;
	/** Whether the document starts a page with this system (`<print new-page="yes">`). */
	startsPage: boolean;
	/** Blank pages the document leaves before the page this system starts. */
	blankPages: number;
	/** The page this system opens, where its `<print>` page-layout sets the page's own height or
	 * vertical margins (paged layouts only); null otherwise. */
	page: PageSize | null;
	/** documentLayout 'strict': the system distance is kept even where the music runs into
	 * the system above. */
	strict: boolean;
	/** Per stave row, whether the gap above it is the document's, kept as set ('strict'); the
	 * music opens every other gap it would print through. */
	fixedGaps: boolean[];
};

/** A paged layout's page, in score px. */
export type PageFrame = {
	width: number;
	height: number;
	marginTop: number;
	marginBottom: number;
	/** How far right the drawing shifts to sit on the page. */
	offsetX: number;
	/** How far right an even page's systems sit from an odd page's, when the document gives
	 * even pages margins of their own. */
	evenShift: number;
};

/** A measure's placed box within its system. */
export type MeasureBox = {
	x: number;
	width: number;
	/** Part of `width` held open before the right barline for a words directive on the
	 * measure's last note (see LayoutPlanner.trailingWordsPad); the notes format into the
	 * rest. 0 for measures with no such directive. */
	trailingPad: number;
	/** Part of `width` held open after the left barline for a CENTERED words directive on the
	 * measure's first note (see LayoutPlanner.leadingWordsPad); the notes start after it.
	 * 0 for measures with no such directive. */
	leadingPad: number;
	systemIndex: number;
	/** First / last measure of its system that is music: a leading or trailing gap is not. */
	isSystemStart: boolean;
	isSystemEnd: boolean;
	/** A gap before the score's first measure ('leading') or after its last ('trailing'):
	 * drawn as a box outside the staves, `x`/`width` being exactly that box. Null for every
	 * other measure, gaps between measures included. */
	edge: 'leading' | 'trailing' | null;
};

/** Where everything goes: parts laid out at a reference width, ready for the draw
 * pass. Pure geometry: no vexflow drawing happens here. */
export type ScoreLayout = {
	measureCount: number;
	totalStaves: number;
	boxes: MeasureBox[];
	/** Each stave's y-offset within a system, indexed by global stave row. The planned
	 * spacing (from the fixed constants) and the floor no system goes below. */
	staveOffsets: number[];
	/** What each system actually needs once drawn, indexed by system (see
	 * SpillResolver.spacedOffsets), which the draw fills in. Before it, the document's own stave
	 * gaps when documentLayout follows the document, else empty: a system missing from it uses
	 * the planned offsets. */
	systemStaveOffsets: Map<number, number[]>;
	/** The document's vertical layout per system, indexed by system; absent unless
	 * documentLayout follows the document. */
	documentSystems?: DocumentSystem[];
	/** The document's engraving sizes when documentLayout follows the document, else
	 * Appearance.NONE. */
	appearance: Appearance;
	/** The page a paged layout fits its systems onto; null for any other layout. */
	page: PageFrame | null;
	/** Top margin: the first system's y. */
	top: number;
	/** Vertical gap between stacked systems. */
	systemGap: number;
	/** Page width (reference width, or content width in panoramic). */
	width: number;
	/** Left space reserved on the first system for part labels AND any <part-group> names
	 * printed outside them (0 when nothing is labelled). Where draw places the names. */
	labelIndent: number;
	/** The part-label column alone, out of `labelIndent`: names right-align against the
	 * staves inside it, and a group name right-aligns against ITS left edge. 0 when no
	 * <part-group> declares a <group-name>, in which case it equals labelIndent. */
	partLabelIndent: number;
	/** The same two columns on every system after the first, holding the abbreviations:
	 * the whole indent, and the part-abbreviation column alone. 0 when nothing has one. */
	laterLabelIndent: number;
	abbreviationIndent: number;
	/** Starting page height, before the draw pass grows it for deep ledger lines. */
	floorHeight: number;
	/** Resolved spacing curve, shared by this measurement and the draw pass so the
	 * drawn notes land where the spacing was computed for. */
	softmaxFactor: number;
};

/** The two widths a measure's note area can take. `ideal` is what the spacing curve wants;
 * `min` is the hard floor below which the notes no longer fit. Layout squeezes between them
 * and never past `min`, so no configuration can produce a system with cut-off notes. */
export type NoteArea = {
	min: number;
	ideal: number;
	fixed?: boolean;
};

/** One stave's inputs to the note-area measurement: the voices to size plus the
 * clef/meter/tab context that shapes their tickables. */
type StaveSpec = {
	voices: StaffVoice[];
	clef: string;
	meterFloor: number;
	isTab: boolean;
	/** Open-string pitches of a tab staff; null for a notation staff (see stringTuning). */
	tuning: number[] | null;
	/** Mid-measure dividers (see ScoreReader.midBarlinesOf): they take horizontal room, so
	 * the measured width has to include the same BarNotes the draw pass inserts. */
	barlines: { beat: number; style: string }[];
	/** Mid-measure clef changes (see ScoreReader.midClefsOf): the small ClefNotes they insert
	 * take horizontal room too, and they re-aim the notes after them. */
	midClefs: MidClefSpec[];
};
