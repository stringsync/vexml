import type { RenderContext } from 'vexflow';

/*
 * A guitar chord-diagram (fret box): strings, frets, finger-position dots, open/muted
 * markers, barres, and an optional fret-position label and title. A self-contained
 * widget drawn onto a VexFlow RenderContext at a given top-left (x, y) — ported from
 * 0xfe/vexchords (chordbox.js), which is unmaintained and pulled in svg.js; here the
 * svg.js primitives are swapped for RenderContext calls (the surface the rest of vexml
 * draws on). Geometry is faithful to vexchords except dots are centered ON the
 * string/fret intersection rather than offset right by their radius (svg.js .move
 * positions a bounding-box corner; we mean the center).
 *
 * ponytail: a single foreground `color` + `bgColor`, not vexchords' six per-element
 * color knobs (string/fret/stroke/text/bridge) — score rendering uses one color. Add
 * the split palette if a caller needs it.
 */

export type ChordDiagramOptions = {
	/** Overall widget width in px (board is 75% of this, centered). */
	width?: number;
	/** Overall widget height in px. */
	height?: number;
	/** Finger-dot radius; defaults to board-width / 18. */
	circleRadius?: number;
	numStrings?: number;
	numFrets?: number;
	/** Draw the tuning letters under the board. */
	showTuning?: boolean;
	/** Line/dot stroke width. */
	strokeWidth?: number;
	/** Foreground (lines, dots, text). */
	color?: string;
	/** Background (open-string circle fill, page). */
	bgColor?: string;
	fontFamily?: string;
	/** Base font size; defaults to board-width / 7. */
	fontSize?: number;
};

/** A `[string, fret]` pair: fret `0` = open, `'x'` = muted, else a (relative) fret number. */
export type ChordNote = [number, number | 'x'];

export type Barre = { fromString: number; toString: number; fret: number };

export type ChordSpec = {
	chord: ChordNote[];
	/** Absolute fret of the top displayed fret line; drawn as a label when > 1. */
	position?: number;
	positionText?: number;
	barres?: Barre[];
	tuning?: string[];
	/** Chord name drawn centered above the board (e.g. "G♯m7♭5"). */
	title?: string;
};

const DEFAULT_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];

export class ChordDiagram {
	private readonly opts: Required<
		Omit<ChordDiagramOptions, 'circleRadius' | 'fontSize'>
	> &
		Pick<ChordDiagramOptions, 'circleRadius' | 'fontSize'>;
	private readonly numStrings: number;
	private readonly numFrets: number;
	private readonly width: number; // board width
	private readonly spacing: number; // gap between strings
	private readonly fretSpacing: number;
	private readonly originX: number; // leftmost string x
	private readonly originY: number; // top fret-line y (nut)
	private readonly circleRadius: number;
	private readonly fontSize: number;
	private readonly barShiftX: number;
	private readonly bridgeWidth: number;

	constructor(
		private readonly x: number,
		private readonly y: number,
		options: ChordDiagramOptions = {},
	) {
		this.opts = {
			width: 100,
			height: 120,
			numStrings: 6,
			numFrets: 5,
			showTuning: true,
			strokeWidth: 1,
			color: '#000',
			bgColor: '#fff',
			fontFamily: 'Arial, sans-serif',
			...options,
		};

		this.numStrings = this.opts.numStrings;
		this.numFrets = this.opts.numFrets;
		this.width = this.opts.width * 0.75;
		this.spacing = this.width / this.numStrings;
		// Vertical bands filling `height`: 1.5 fret-rows of headroom for the open/mute
		// markers above the nut, numFrets fret rows, then a tuning row when shown plus a
		// little bottom pad. The title (when present) is drawn ABOVE y, outside this box,
		// so it never shares the marker band. See the `top` getter.
		const vRows = this.numFrets + 3 + (this.opts.showTuning ? 1 : 0);
		this.fretSpacing = this.opts.height / vRows;
		// Inset so the dots on the outer strings have room on either side.
		this.originX = x + this.opts.width * 0.15 + this.spacing / 2;
		this.originY = y + this.fretSpacing * 1.5;
		this.circleRadius = options.circleRadius ?? this.width / 18;
		this.fontSize = options.fontSize ?? Math.ceil(this.width / 7);
		this.barShiftX = this.width / 28;
		this.bridgeWidth = Math.max(2, Math.ceil(this.fretSpacing / 4));
	}

	/** Title font size — readable regardless of how small the box's own labels get. */
	private get titleSize(): number {
		return Math.max(this.fontSize, 11);
	}

	/** Topmost y the widget draws to (set by draw), so callers can grow the page crop. */
	get top(): number {
		return this.drawnTop ?? this.y - this.titleSize * 2;
	}

	private drawnTop: number | null = null;

	draw(context: RenderContext, spec: ChordSpec): void {
		const chord = spec.chord;
		const position = spec.position ?? 0;
		const positionText = spec.positionText ?? 0;
		const barres = spec.barres ?? [];
		const tuning = spec.tuning ?? DEFAULT_TUNING;
		const { spacing, fretSpacing, originX, originY } = this;

		// The strings overhang past the last fret line at the bottom — and, when a position
		// label is shown (no nut), past the top fret line too — so the neck reads as
		// continuing beyond the diagram.
		const overhang = fretSpacing * 0.4;
		const topOverhang = position > 1 ? overhang : 0;
		// A marker (X muted / O open) is drawn for any muted or open string. With none, the
		// top band is empty whitespace, so drop the title down next to the board instead of
		// floating it above an empty row.
		const hasMarkers = chord.some(([, fret]) => fret === 'x' || fret === 0);

		if (spec.title) {
			const size = this.titleSize;
			const topY = hasMarkers
				? this.y - size * 1.4 // above the box, clearing the marker row
				: originY - topOverhang - fretSpacing * 0.5 - size * 0.73; // just above the board
			this.titleText(
				context,
				this.x + this.opts.width / 2,
				topY,
				spec.title,
				size,
			);
			this.drawnTop = Math.min(topY, originY - topOverhang);
		} else {
			this.drawnTop = originY - topOverhang;
		}

		// Nut (open position) or fret-position label.
		if (position <= 1) {
			const w = spacing * (this.numStrings - 1) + this.opts.strokeWidth;
			context.save();
			context.setFillStyle(this.opts.color);
			context.fillRect(
				originX - this.opts.strokeWidth / 2,
				originY - this.bridgeWidth,
				w,
				this.bridgeWidth,
			);
			context.restore();
		} else {
			this.text(
				context,
				originX - spacing / 2 - spacing * 0.45,
				originY + fretSpacing * positionText,
				String(position),
			);
		}

		// Strings (vertical) and frets (horizontal); see `overhang` above.
		for (let i = 0; i < this.numStrings; i += 1) {
			this.line(
				context,
				originX + spacing * i,
				originY - topOverhang,
				originX + spacing * i,
				originY + fretSpacing * this.numFrets + overhang,
			);
		}
		for (let i = 0; i < this.numFrets + 1; i += 1) {
			this.line(
				context,
				originX,
				originY + fretSpacing * i,
				originX + spacing * (this.numStrings - 1),
				originY + fretSpacing * i,
			);
		}

		if (this.opts.showTuning && tuning.length > 0) {
			for (let i = 0; i < Math.min(this.numStrings, tuning.length); i += 1) {
				this.text(
					context,
					originX + spacing * i,
					originY + this.numFrets * fretSpacing + fretSpacing / 2,
					tuning[i] ?? '',
				);
			}
		}

		for (const [string, fret] of chord) {
			this.lightUp(context, string, fret, position, positionText);
		}
		for (const barre of barres) {
			this.lightBar(context, barre, position, positionText);
		}
	}

	private lightUp(
		context: RenderContext,
		string: number,
		fret: number | 'x',
		position: number,
		positionText: number,
	): void {
		const stringNum = this.numStrings - string;
		const shift = position === 1 && positionText === 1 ? positionText : 0;
		const mute = fret === 'x';
		const fretNum = mute ? 0 : (fret as number) - shift;

		const x = this.originX + this.spacing * stringNum;
		let y = this.originY + this.fretSpacing * fretNum;
		if (fretNum === 0) {
			y -= this.bridgeWidth;
		}

		if (mute) {
			this.text(context, x, y - this.fretSpacing, 'X');
			return;
		}

		// Dot centered on the string, in the middle of the fret space. Fretted = filled,
		// open (fret 0) = hollow ring.
		const cy = y - this.fretSpacing / 2;
		context.save();
		context.setLineWidth(this.opts.strokeWidth);
		context.setStrokeStyle(this.opts.color);
		context.setFillStyle(fretNum > 0 ? this.opts.color : this.opts.bgColor);
		context.beginPath();
		context.arc(x, cy, this.circleRadius, 0, Math.PI * 2, false);
		context.fill();
		context.stroke();
		context.restore();
	}

	private lightBar(
		context: RenderContext,
		barre: Barre,
		position: number,
		positionText: number,
	): void {
		let fretNum = barre.fret;
		if (position === 1 && positionText === 1) {
			fretNum -= positionText;
		}
		const fromNum = this.numStrings - barre.fromString;
		const toNum = this.numStrings - barre.toString;
		const x = this.originX + this.spacing * fromNum - this.barShiftX;
		const xTo = this.originX + this.spacing * toNum + this.barShiftX;
		const y =
			this.originY + this.fretSpacing * (fretNum - 1) + this.fretSpacing / 4;
		const yTo =
			this.originY +
			this.fretSpacing * (fretNum - 1) +
			(this.fretSpacing / 4) * 3;
		// ponytail: square-ended bar. Add rounded caps if it reads poorly at small sizes.
		context.save();
		context.setFillStyle(this.opts.color);
		context.fillRect(x, y, xTo - x, yTo - y);
		context.restore();
	}

	private line(
		context: RenderContext,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
	): void {
		context.save();
		context.setLineWidth(this.opts.strokeWidth);
		context.setStrokeStyle(this.opts.color);
		context.beginPath();
		context.moveTo(x1, y1);
		context.lineTo(x2, y2);
		context.stroke();
		context.restore();
	}

	// Draw `msg` horizontally centered on `x`, with `topY` the intended top of the text
	// (RenderContext.fillText takes a baseline, so add the ascent).
	private text(
		context: RenderContext,
		x: number,
		topY: number,
		msg: string,
		size = this.fontSize,
	): void {
		context.save();
		context.setFont(this.opts.fontFamily, size);
		context.setFillStyle(this.opts.color);
		const w = context.measureText(msg).width;
		context.fillText(msg, x - w / 2, topY + size * 0.73);
		context.restore();
	}

	// Like `text`, but draws char by char so the ♯/♭/♮ glyphs — which carry wide
	// side-bearings in text fonts and would otherwise read as "G ♯ m7 ♭ 5" — are pulled
	// tight against their neighbours and rendered a touch smaller, matching the chord
	// symbols drawn elsewhere (drawHarmony).
	private titleText(
		context: RenderContext,
		centerX: number,
		topY: number,
		msg: string,
		size: number,
	): void {
		const accSize = size - 2;
		const kern = size * 0.18;
		const chars = [...msg];
		const fontFor = (ch: string) =>
			context.setFont(
				this.opts.fontFamily,
				ACCIDENTALS.has(ch) ? accSize : size,
			);

		context.save();
		context.setFillStyle(this.opts.color);
		// Measure the kerned advance first so the whole string lands centered on centerX.
		let total = 0;
		for (const ch of chars) {
			fontFor(ch);
			total +=
				context.measureText(ch).width - (ACCIDENTALS.has(ch) ? kern * 2 : 0);
		}
		const baseline = topY + size * 0.73;
		let x = centerX - total / 2;
		for (const ch of chars) {
			const acc = ACCIDENTALS.has(ch);
			fontFor(ch);
			if (acc) {
				x -= kern;
			}
			context.fillText(ch, x, baseline);
			x += context.measureText(ch).width;
			if (acc) {
				x -= kern;
			}
		}
		context.restore();
	}
}

// Accidental glyphs in a chord title; pulled tight against their root letter.
const ACCIDENTALS = new Set(['♯', '♭', '♮']);
