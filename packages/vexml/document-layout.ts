/*
 * The page, system and staff layout a document asks for, in vexml px: what
 * `documentLayout` follows. Read by ScoreReader.documentLayoutOf, answered per system by
 * its first measure.
 *
 * MusicXML gives every distance in tenths, a tenth of a staff space. vexml engraves a staff
 * space at 10px, so a tenth is exactly one px here, whatever `<scaling>` says: scaling ties
 * tenths to millimeters, and vexml never draws at a physical size.
 *
 * A `<print>` layout applies to the system (or page) it starts and no further, as the
 * MusicXML spec has it; everything else falls back to `<defaults>`, and what neither sets
 * falls back to vexml's own spacing (null here).
 */
export class DocumentLayout {
	constructor(
		private readonly defaults: LayoutBlock,
		/* Per measure index, each part's `<print>` layout there (null for a part with none). */
		private readonly prints: ReadonlyMap<
			number,
			readonly (LayoutBlock | null)[]
		>,
	) {}

	/* The page `<defaults>` sets, or null without a page width, or with margins that leave
	 * the page no room. A page height is only needed by a paged layout, and margins left out
	 * are 0. */
	page(): DocumentPage | null {
		const { pageWidth, pageHeight, pageMargins } = this.defaults;
		const margins = pageMargins ?? { left: 0, right: 0, top: 0, bottom: 0 };
		if (
			pageWidth === null ||
			pageWidth <= margins.left + margins.right ||
			(pageHeight !== null && pageHeight <= margins.top + margins.bottom)
		) {
			return null;
		}
		return { width: pageWidth, height: pageHeight, margins };
	}

	/* The indent from the page margins of the system opening on measure `m`. */
	systemMargins(m: number): { left: number; right: number } {
		return {
			left: this.systemValue(m, 'systemLeft') ?? 0,
			right: this.systemValue(m, 'systemRight') ?? 0,
		};
	}

	/* Px from the bottom line of the system above to the top line of the one opening on `m`. */
	systemDistance(m: number): number | null {
		return this.systemValue(m, 'systemDistance');
	}

	/* Px from the page's top margin to the top line of the system opening on `m`, when it opens
	 * a page. */
	topSystemDistance(m: number): number | null {
		return this.systemValue(m, 'topSystemDistance');
	}

	/* Px from the bottom line of the stave above to the top line of part `partIndex`'s staff
	 * `staffNumber`, in the system opening on `m`. A staff-layout naming its staff beats one
	 * naming none, and the part's own `<print>` beats `<defaults>`. */
	staffDistance(
		m: number,
		partIndex: number,
		staffNumber: string,
	): number | null {
		const print = this.prints.get(m)?.[partIndex]?.staffDistances;
		const defaults = this.defaults.staffDistances;
		return (
			print?.get(staffNumber) ??
			print?.get(ANY_STAFF) ??
			defaults.get(staffNumber) ??
			defaults.get(ANY_STAFF) ??
			null
		);
	}

	/* Whether the document starts a page at measure `m`. */
	startsPage(m: number): boolean {
		return this.prints.get(m)?.some((print) => print?.newPage) ?? false;
	}

	/* The blank pages the document leaves before the page it starts at measure `m`. The spec
	 * ignores them without new-page, so they count only where {@link startsPage} does. */
	blankPages(m: number): number {
		return this.startsPage(m)
			? Math.max(
					0,
					...(this.prints.get(m) ?? []).map((p) => p?.blankPages ?? 0),
				)
			: 0;
	}

	// A system-layout value is the score's, not a part's: the first part that sets it wins.
	private systemValue(
		m: number,
		key: 'systemLeft' | 'systemRight' | 'systemDistance' | 'topSystemDistance',
	): number | null {
		for (const print of this.prints.get(m) ?? []) {
			const value = print?.[key];
			if (value !== null && value !== undefined) {
				return value;
			}
		}
		return this.defaults[key];
	}
}

/* The key of a `<staff-layout>` with no number, which applies to every staff. */
export const ANY_STAFF = '';

/* One `<defaults>` or `<print>`'s layout, in px, null (or absent from the map) where unset. */
export type LayoutBlock = {
	pageWidth: number | null;
	pageHeight: number | null;
	/* The odd-page (or both-page) margins: vexml lays every page out alike. */
	pageMargins: PageMargins | null;
	systemLeft: number | null;
	systemRight: number | null;
	systemDistance: number | null;
	topSystemDistance: number | null;
	/* Staff number (ANY_STAFF for none) to its staff-distance. */
	staffDistances: ReadonlyMap<string, number>;
	/* A `<print new-page="yes">`; always false for `<defaults>`. */
	newPage: boolean;
	/* A `<print blank-page="N">`: pages left blank before the one a new-page print starts; 0
	 * for `<defaults>`. */
	blankPages: number;
};

export type PageMargins = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

export type DocumentPage = {
	width: number;
	height: number | null;
	margins: PageMargins;
};
