import type { RenderContext } from 'vexflow';
import { DEFAULT_TUNING, HARMONY_ACCIDENTALS } from '../constants';

/** A `[string, fret]` pair: fret `0` = open, `'x'` = muted, else a (relative) fret number. */
export type ChordNote = [number, number | 'x'];

/** A finger barring `fromString`..`toString` at `fret` (a single bar drawn across those strings). */
export type Barre = { fromString: number; toString: number; fret: number };

/** Everything a {@link ChordDiagramGlyph} needs: the chord data plus optional styling. */
export type ChordDiagramGlyphOptions = {
	/** The fretted notes: one `[string, fret]` pair per played/muted string. */
	chord: ChordNote[];
	/** Absolute fret of the top displayed fret line; drawn as a label when > 1. */
	position?: number;
	positionText?: number;
	barres?: Barre[];
	tuning?: string[];
	/** Chord name drawn centered above the board (e.g. "G♯m7♭5"). */
	title?: string;
	/** Overall widget width in px (board is 75% of this, centered). */
	width?: number;
	/** Overall widget height in px. */
	height?: number;
	stringCount?: number;
	fretCount?: number;
	/** Draw the tuning letters under the board. */
	showTuning?: boolean;
	/** Line/dot stroke width. */
	strokeWidth?: number;
	/** Foreground (lines, dots, text). */
	color?: string;
	/** Background (open-string circle fill, page). */
	bgColor?: string;
	fontFamily?: string;
	/** Finger-dot radius; defaults to board-width / 18. */
	circleRadius?: number;
	/** Base font size; defaults to board-width / 7. */
	fontSize?: number;
};

/**
 * The chord-data subset: what a source (e.g. MusicXML) describes before render-time
 * geometry is known. Merged with styling to build a diagram.
 */
export type ChordFrame = Pick<
	ChordDiagramGlyphOptions,
	'chord' | 'position' | 'positionText' | 'barres'
>;

/** The defaultable styling subset — every field gets a fallback in the constructor. */
type ChordStyle = Pick<
	ChordDiagramGlyphOptions,
	| 'width'
	| 'height'
	| 'stringCount'
	| 'fretCount'
	| 'showTuning'
	| 'strokeWidth'
	| 'color'
	| 'bgColor'
	| 'fontFamily'
>;

export class ChordDiagramGlyph {
	private readonly opts: Required<ChordStyle>;
	private readonly chord: ChordNote[];
	private readonly position: number;
	private readonly positionText: number;
	private readonly barres: Barre[];
	private readonly tuning: string[];
	private readonly title?: string;
	private readonly stringCount: number;
	private readonly fretCount: number;
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
		options: ChordDiagramGlyphOptions,
	) {
		this.opts = {
			width: 100,
			height: 120,
			stringCount: 6,
			fretCount: 5,
			showTuning: true,
			strokeWidth: 1,
			color: '#000',
			bgColor: '#fff',
			fontFamily: 'Arial, sans-serif',
			...options,
		};
		this.chord = options.chord;
		this.position = options.position ?? 0;
		this.positionText = options.positionText ?? 0;
		this.barres = options.barres ?? [];
		this.tuning = options.tuning ?? DEFAULT_TUNING;
		this.title = options.title;

		this.stringCount = this.opts.stringCount;
		this.fretCount = this.opts.fretCount;
		this.width = this.opts.width * 0.75;
		this.spacing = this.width / this.stringCount;
		// Vertical bands filling `height`: 1.5 fret-rows of headroom for the open/mute
		// markers above the nut, fretCount fret rows, then a tuning row when shown plus a
		// little bottom pad. The title (when present) is drawn ABOVE y, outside this box,
		// so it never shares the marker band. See the `top` getter.
		const vRows = this.fretCount + 3 + (this.opts.showTuning ? 1 : 0);
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

	draw(context: RenderContext): void {
		const { chord, position, positionText, barres, tuning } = this;
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

		if (this.title) {
			const size = this.titleSize;
			const topY = hasMarkers
				? this.y - size * 1.4 // above the box, clearing the marker row
				: originY - topOverhang - fretSpacing * 0.5 - size * 0.73; // just above the board
			this.titleText(
				context,
				this.x + this.opts.width / 2,
				topY,
				this.title,
				size,
			);
			// titleText draws the baseline at topY + size*0.73, but a font's real ascent is closer to
			// a full em, so the cap tops land ~size above the baseline — about 0.27*size ABOVE topY.
			// Bound the title at that true top so callers reserving space above it (the page crop, the
			// playback cursor/scroll box) cover those pixels instead of clipping them.
			const titleTop = topY + size * 0.73 - size;
			this.drawnTop = Math.min(titleTop, originY - topOverhang);
		} else {
			this.drawnTop = originY - topOverhang;
		}

		// Nut (open position) or fret-position label.
		if (position <= 1) {
			const w = spacing * (this.stringCount - 1) + this.opts.strokeWidth;
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
		for (let i = 0; i < this.stringCount; i += 1) {
			this.line(
				context,
				originX + spacing * i,
				originY - topOverhang,
				originX + spacing * i,
				originY + fretSpacing * this.fretCount + overhang,
			);
		}
		for (let i = 0; i < this.fretCount + 1; i += 1) {
			this.line(
				context,
				originX,
				originY + fretSpacing * i,
				originX + spacing * (this.stringCount - 1),
				originY + fretSpacing * i,
			);
		}

		if (this.opts.showTuning && tuning.length > 0) {
			for (let i = 0; i < Math.min(this.stringCount, tuning.length); i += 1) {
				this.text(
					context,
					originX + spacing * i,
					originY + this.fretCount * fretSpacing + fretSpacing / 2,
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
		const stringNum = this.stringCount - string;
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
		const fromNum = this.stringCount - barre.fromString;
		const toNum = this.stringCount - barre.toString;
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
				HARMONY_ACCIDENTALS.has(ch) ? accSize : size,
			);

		context.save();
		context.setFillStyle(this.opts.color);
		// Measure the kerned advance first so the whole string lands centered on centerX.
		let total = 0;
		for (const ch of chars) {
			fontFor(ch);
			total +=
				context.measureText(ch).width -
				(HARMONY_ACCIDENTALS.has(ch) ? kern * 2 : 0);
		}
		const baseline = topY + size * 0.73;
		let x = centerX - total / 2;
		for (const ch of chars) {
			const acc = HARMONY_ACCIDENTALS.has(ch);
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
