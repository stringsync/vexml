/*
 * The engraving sizes a document's `<defaults><appearance>` asks for, in vexml px: what
 * `documentLayout` follows along with the page. Read by ScoreReader.appearanceOf.
 *
 * Like the layout distances (see DocumentLayout), every value is in tenths, read as px since
 * vexml engraves a staff space at 10px. A type the document leaves out answers null, and the
 * drawing keeps vexml's own size for it.
 */
export class Appearance {
	/* No appearance at all: what every lookup answers when the document is not followed. */
	static readonly NONE = new Appearance(new Map(), new Map());

	constructor(
		/* `<line-width type>` to its width. */
		private readonly lineWidths: ReadonlyMap<string, number>,
		/* `<distance type>` to its distance. */
		private readonly distances: ReadonlyMap<string, number>,
	) {}

	/* The width of a kind of line ("stem", "beam", "staff", "leger", "slur middle", ...). */
	lineWidth(type: LineWidthType): number | null {
		return this.lineWidths.get(type) ?? null;
	}

	/* A standard distance ("beam", "hyphen"). */
	distance(type: DistanceType): number | null {
		return this.distances.get(type) ?? null;
	}
}

/* The `<line-width>` types vexml draws to. */
export type LineWidthType =
	| 'beam'
	| 'ending'
	| 'extend'
	| 'leger'
	| 'slur middle'
	| 'staff'
	| 'stem'
	| 'tie middle'
	| 'tuplet bracket'
	| 'wedge';

/* The `<distance>` types vexml draws to. */
export type DistanceType = 'beam' | 'hyphen';
