import {
	Annotation,
	Articulation,
	type Beam,
	Element,
	Metrics,
	Modifier,
	Ornament,
	Stem,
	StemmableNote,
	Tuplet,
	type TupletOptions,
} from 'vexflow/core';

/* A note value as <tuplet-type>/<normal-type> name it, with its dot count. */
export type TupletNoteValue = { type: string; dots: number };

export type DisplayTupletOptions = TupletOptions & {
	/* <tuplet show-number>: "none" prints no numeral, "both" is handled by `ratioed`. */
	showNumber?: 'actual' | 'both' | 'none' | null;
	/* <tuplet show-type>: which side(s) of the ratio get a note-value glyph beside the numeral. */
	showType?: 'actual' | 'both' | 'none' | null;
	actualValue?: TupletNoteValue | null;
	normalValue?: TupletNoteValue | null;
	/* <tuplet line-shape="curved">: arcs in place of the square bracket. */
	curved?: boolean;
	/* The square bracket's line width (`<line-width type="tuplet bracket">`); vexflow's 1px
	 * when absent. */
	bracketWidth?: number | null;
	/* Whether to rescale the notes' ticks by notesOccupied / numNotes (vexflow's default).
	 * False for a single-note tremolo whose written value already equals its sounding duration. */
	rescale?: boolean;
};

/* SMuFL metNote*Up glyphs, as metronome-glyph.ts draws them, and metAugmentationDot. */
const NOTE_GLYPHS: Record<string, string> = {
	breve: '\uECA0',
	whole: '\uECA2',
	half: '\uECA3',
	quarter: '\uECA5',
	eighth: '\uECA7',
	'16th': '\uECA9',
	'32nd': '\uECAB',
	'64th': '\uECAD',
	'128th': '\uECAF',
};
const DOT_GLYPH = '\uECB7';
const COLON_GLYPH = '\uE88A';
const DIGIT_BASE = 0xe880;

/* How far from the bracket's end the arc starts, away from the notes, as a fraction of a leg. */
const LEG = 10;
/* Air between the numeral and the line on either side, as vexflow leaves it. */
const TEXT_GAP = 5;
/* Reference numeral for vertical alignment when a tuplet shows note-value glyphs without digits. */
const REFERENCE_DIGIT = String.fromCharCode(DIGIT_BASE);

type LabelRun = {
	kind: 'numeral' | 'note';
	element: Element;
};

/*
 * A vexflow Tuplet that can print what MusicXML's <tuplet> asks for and vexflow's cannot: no
 * numeral at all (show-number="none"), note-value glyphs beside the numeral (show-type), and a
 * curved line (line-shape="curved"). With none of those set it draws exactly as Tuplet does.
 */
export class DisplayTuplet extends Tuplet {
	private readonly curved: boolean;
	private readonly bracketWidth: number | null;
	private readonly runs: LabelRun[] | null;
	private slopedRange: { top: number; bottom: number } | null = null;

	constructor(
		notes: ConstructorParameters<typeof Tuplet>[0],
		opts: DisplayTupletOptions = {},
	) {
		const {
			showNumber,
			showType,
			actualValue,
			normalValue,
			curved,
			bracketWidth,
			rescale,
			...rest
		} = opts;
		super(notes, rest);
		if (rescale === false) {
			this.detach();
		}
		this.curved = curved ?? false;
		this.bracketWidth = bracketWidth ?? null;
		const ratioed = this.options.ratioed;
		const typeActual = showType === 'actual' || showType === 'both';
		const typeNormal = showType === 'both';
		const actualGlyphs = typeActual && actualValue ? glyphs(actualValue) : '';
		const normalGlyphs = typeNormal && normalValue ? glyphs(normalValue) : '';
		const hasNoteGlyphs = actualGlyphs !== '' || normalGlyphs !== '';
		if (hasNoteGlyphs) {
			const showDigits = showNumber !== 'none';
			const actualDigits = showDigits ? digits(this.options.numNotes) : '';
			const normalDigits = showDigits ? digits(this.options.notesOccupied) : '';
			const showNormal =
				(ratioed && showDigits) || (typeNormal && normalGlyphs !== '');
			const runs: LabelRun[] = [];
			if (actualDigits !== '') {
				runs.push(makeRun('numeral', actualDigits));
			}
			if (actualGlyphs !== '') {
				runs.push(makeRun('note', actualGlyphs));
			}
			if (showNormal) {
				const colonAndNormal = COLON_GLYPH + normalDigits;
				const prev = runs[runs.length - 1];
				if (prev && prev.kind === 'numeral') {
					prev.element.setText(prev.element.getText() + colonAndNormal);
				} else {
					runs.push(makeRun('numeral', colonAndNormal));
				}
				if (normalGlyphs !== '') {
					runs.push(makeRun('note', normalGlyphs));
				}
			}
			this.runs = runs;
		} else {
			this.runs = null;
			if (showNumber === 'none') {
				this.textElement.setText('');
			}
		}
	}

	override draw(): void {
		this.slopedRange = null;
		const { location, bracketed, textYOffset } = this.options;
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		if (!first || !last) {
			return;
		}
		const sloped = this.resolveSlopedBracket(first, last);
		if (
			this.runs === null &&
			sloped === null &&
			!this.curved &&
			this.bracketWidth === null &&
			this.textElement.getText() !== ''
		) {
			super.draw();
			return;
		}
		const ctx = this.checkContext();
		let xPos: number;
		if (bracketed) {
			xPos = first.getTieLeftX() - TEXT_GAP;
			this.width = last.getTieRightX() - xPos + TEXT_GAP;
		} else {
			xPos = stemX(first);
			this.width = stemX(last) - xPos;
		}
		const runGap = Metrics.get('Tuplet.suffix.extraSpacing');
		const textWidth = this.runs
			? measureRuns(this.runs, runGap)
			: this.textElement.getWidth();
		const center = xPos + this.width / 2;
		const slope = sloped?.slope ?? 0;
		const yCenter = sloped?.yCenter ?? this.getYPosition();
		const yAt = (x: number) => yCenter + slope * (x - center);
		if (sloped !== null) {
			const yLeft = yAt(xPos);
			const yRight = yAt(xPos + this.width);
			this.slopedRange = {
				top: Math.min(yLeft, yRight),
				bottom: Math.max(yLeft, yRight),
			};
		}
		ctx.openGroup('tuplet', this.getAttribute('id'));
		if (bracketed) {
			const half = textWidth === 0 ? 0 : textWidth / 2 + TEXT_GAP;
			const run = this.width / 2 - half;
			if (run > 0) {
				if (this.curved) {
					this.arc(xPos, center - half, yCenter, location);
					this.arc(xPos + this.width, center + half, yCenter, location);
				} else {
					const width = this.bracketWidth ?? 1;
					const drawArm = (x1: number, x2: number) => {
						if (slope === 0) {
							ctx.fillRect(x1, yCenter, x2 - x1, width);
							return;
						}
						const y1 = yAt(x1);
						const y2 = yAt(x2);
						ctx.beginPath();
						ctx.moveTo(x1, y1);
						ctx.lineTo(x2, y2);
						ctx.lineTo(x2, y2 + width);
						ctx.lineTo(x1, y1 + width);
						ctx.closePath();
						ctx.fill();
					};
					if (half === 0) {
						// No numeral to split around: one unbroken line.
						drawArm(xPos, xPos + this.width);
					} else {
						drawArm(xPos, center - half);
						drawArm(center + half, xPos + this.width);
					}
					const legOffset = location === Tuplet.LOCATION_BOTTOM ? width : 0;
					ctx.fillRect(xPos, yAt(xPos) + legOffset, width, location * LEG);
					ctx.fillRect(
						xPos + this.width,
						yAt(xPos + this.width) + legOffset,
						width,
						location * LEG,
					);
				}
			}
		}
		if (this.runs && textWidth > 0) {
			const numeralHeight = this.numeralHeight(this.runs);
			const numeralY =
				yCenter +
				numeralHeight / 2 +
				(location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset;
			const noteY = numeralY + Metrics.get('Tuplet.suffix.suffixOffsetY');
			let cursorX = center - textWidth / 2;
			for (let i = 0; i < this.runs.length; i++) {
				const run = this.runs[i];
				if (!run) {
					continue;
				}
				if (i > 0) {
					cursorX += runGap;
				}
				run.element.renderText(
					ctx,
					cursorX,
					run.kind === 'note' ? noteY : numeralY,
				);
				cursorX += run.element.getWidth();
			}
		} else if (textWidth > 0) {
			this.textElement.renderText(
				ctx,
				center - textWidth / 2,
				yCenter +
					this.textElement.getHeight() / 2 +
					(location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset,
			);
		}
		ctx.closeGroup();
		this.setRendered();
	}

	getLocation(): number {
		return this.options.location;
	}

	isBracketed(): boolean {
		return Boolean(this.options.bracketed);
	}

	/* Shift the bracket and numeral vertically by `delta` px (negative = up, positive = down). */
	shiftYOffset(delta: number): void {
		this.options.yOffset = (this.options.yOffset ?? 0) + delta;
	}

	private numeralHeight(runs: LabelRun[]): number {
		const numeral = runs.find((r) => r.kind === 'numeral');
		if (numeral) {
			return numeral.element.getHeight();
		}
		const ref = new Element('Tuplet');
		ref.setText(REFERENCE_DIGIT);
		return ref.getHeight();
	}

	/* The vertical span of a sloped bracket's line, or null when drawn horizontal. */
	getBracketYRange(): { top: number; bottom: number } | null {
		return this.slopedRange;
	}

	/*
	 * Behind Bars p. 197: a bracket over beamed notes slopes parallel to its beam(s) when
	 * every beam in the group slopes the same way, and stays horizontal when beams slope in
	 * opposing directions or when sloping would push the bracket into the stave.
	 */
	private resolveSlopedBracket(
		first: (typeof this.notes)[number],
		last: (typeof this.notes)[number],
	): { slope: number; yCenter: number } | null {
		if (!this.options.bracketed || this.curved) {
			return null;
		}
		const slope = this.beamedBracketSlope();
		if (slope === 0) {
			return null;
		}
		const stave = first.getStave();
		if (!stave) {
			return null;
		}
		const space = stave.getSpacingBetweenLines();
		const xPos = first.getTieLeftX() - TEXT_GAP;
		const bodyWidth = last.getTieRightX() - xPos + TEXT_GAP;
		const center = xPos + bodyWidth / 2;
		const above = this.options.location === Tuplet.LOCATION_TOP;
		const nestedOffset =
			this.getNestedTupletCount() *
			Tuplet.NESTING_OFFSET *
			-this.options.location;
		const yOffset = this.options.yOffset ?? 0;
		const modPad = LEG + space / 4;
		let yCenter = above ? Infinity : -Infinity;
		for (const note of this.notes) {
			const nx = stemX(note);
			let req = above ? Infinity : -Infinity;
			if (note.hasStem() || note.isRest()) {
				const { topY, baseY } = note.getStemExtents();
				const up = note.getStemDirection() === Stem.UP;
				const stemY = stemClearanceY(topY, baseY, above, up, space);
				if (stemY !== undefined) {
					req = above ? Math.min(req, stemY) : Math.max(req, stemY);
				}
				if (above) {
					const mc = note.getModifierContext();
					const modLines = mc ? mc.getUnmeasuredTextLines(true) : 0;
					if (modLines > 0) {
						req = Math.min(req, note.getYForTopText(modLines) - 2 * space);
					}
				}
			}
			const modPos = above ? Modifier.Position.ABOVE : Modifier.Position.BELOW;
			for (const mark of note.getModifiers()) {
				if (mark.getPosition() !== modPos) {
					continue;
				}
				let box: { y: number; h: number } | undefined;
				if (mark instanceof Articulation) {
					box = mark.getInkBounds();
				} else if (mark instanceof Ornament) {
					box = mark.getBoundingBox();
				}
				if (box) {
					req = above
						? Math.min(req, box.y - modPad)
						: Math.max(req, box.y + box.h + modPad);
				}
			}
			const side = above
				? Annotation.VerticalJustify.TOP
				: Annotation.VerticalJustify.BOTTOM;
			const annotations =
				note.getModifierContext()?.getMembers('Annotation') ?? [];
			for (const mark of annotations) {
				if (
					!(mark instanceof Annotation) ||
					mark.getVerticalJustification() !== side ||
					mark.checkAttachedNote().getStave() !== note.getStave()
				) {
					continue;
				}
				const ink = mark.getTextInk(0, mark.computeY().y);
				req = above
					? Math.min(req, ink.y - modPad)
					: Math.max(req, ink.y + ink.h + modPad);
			}
			if (!Number.isFinite(req)) {
				continue;
			}
			const candidate = req - slope * (nx - center);
			yCenter = above
				? Math.min(yCenter, candidate)
				: Math.max(yCenter, candidate);
		}
		if (!Number.isFinite(yCenter)) {
			return null;
		}
		yCenter += nestedOffset + yOffset;
		const yLeft = yCenter + slope * (xPos - center);
		const yRight = yCenter + slope * (xPos + bodyWidth - center);
		if (above) {
			const topLine = stave.getYForLine(0);
			const lowEnd = Math.max(yLeft, yRight);
			// If the bracket line itself would sit near or inside the stave, keep it horizontal.
			if (lowEnd > topLine - 0.5 * space) {
				return null;
			}
			// Keep the leg tips outside the outer stave line (Behind Bars p. 199).
			if (lowEnd + LEG > topLine) {
				yCenter -= lowEnd + LEG - topLine;
			}
		} else {
			const bottomLine = stave.getYForLine(stave.getNumLines() - 1);
			const highEnd = Math.min(yLeft, yRight);
			if (highEnd < bottomLine + 0.5 * space) {
				return null;
			}
			if (highEnd - LEG < bottomLine) {
				yCenter += bottomLine - (highEnd - LEG);
			}
		}
		return { slope, yCenter };
	}

	private beamedBracketSlope(): number {
		const beams = new Set<Beam>();
		for (const note of this.notes) {
			if (note instanceof StemmableNote) {
				const beam = note.getBeam();
				if (beam) {
					beams.add(beam);
				}
			}
		}
		if (beams.size === 0) {
			return 0;
		}
		let sign = 0;
		let sum = 0;
		for (const beam of beams) {
			const s = beam.slope;
			if (!Number.isFinite(s) || Math.abs(s) < 1e-4) {
				return 0;
			}
			const dir = Math.sign(s);
			if (sign === 0) {
				sign = dir;
			} else if (dir !== sign) {
				return 0;
			}
			sum += s;
		}
		return sum / beams.size;
	}

	/*
	 * One half of the curved line: from the bracket's end, LEG toward the notes, sweeping out to
	 * the line's own height at `toX`. The ink is a thin lens (a second pass offset by a pixel),
	 * filled once, as CrispCurve does for slurs.
	 */
	private arc(
		fromX: number,
		toX: number,
		yPos: number,
		location: number,
	): void {
		const ctx = this.checkContext();
		const startY = yPos + location * LEG;
		const inward = toX > fromX ? 1 : -1;
		ctx.beginPath();
		ctx.moveTo(fromX, startY);
		ctx.quadraticCurveTo(fromX, yPos, toX, yPos);
		ctx.lineTo(toX, yPos + location);
		ctx.quadraticCurveTo(
			fromX + inward,
			yPos + location,
			fromX + inward,
			startY,
		);
		ctx.closePath();
		ctx.fill();
	}
}

function makeRun(kind: 'numeral' | 'note', text: string): LabelRun {
	const element = new Element(kind === 'note' ? 'Tuplet.suffix' : 'Tuplet');
	element.setText(text);
	return { kind, element };
}

function measureRuns(runs: LabelRun[], gap: number): number {
	let width = 0;
	for (let i = 0; i < runs.length; i++) {
		const run = runs[i];
		if (!run) {
			continue;
		}
		if (i > 0) {
			width += gap;
		}
		width += run.element.getWidth();
	}
	return width;
}

function digits(n: number): string {
	let out = '';
	for (let rest = n; rest >= 1; rest = Math.floor(rest / 10)) {
		out = String.fromCharCode(DIGIT_BASE + (rest % 10)) + out;
	}
	return out;
}

function glyphs(value: TupletNoteValue): string {
	const note = NOTE_GLYPHS[value.type];
	return note ? note + DOT_GLYPH.repeat(value.dots) : '';
}

function stemClearanceY(
	topY: number | undefined,
	baseY: number | undefined,
	above: boolean,
	up: boolean,
	space: number,
): number | undefined {
	if (above) {
		if (up) {
			return topY !== undefined ? topY - space : undefined;
		}
		return baseY !== undefined ? baseY - 2 * space : undefined;
	}
	if (up) {
		return baseY !== undefined ? baseY + 2 * space : undefined;
	}
	return topY !== undefined ? topY + space : undefined;
}

/* Tuplet types its notes as plain Notes, but the unbracketed form only ever sees stemmable ones. */
function stemX(note: {
	getStemX?: () => number;
	getAbsoluteX(): number;
}): number {
	return note.getStemX?.() ?? note.getAbsoluteX();
}
