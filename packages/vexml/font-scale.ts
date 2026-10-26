// The text size MusicXML applications write when they set no word-font: 10pt, the size
// MuseScore and Finale both default words to.
const DEFAULT_TEXT_POINTS = 10;

// The CSS font-size names, as ratios to `medium`, the document's default size.
const CSS_FONT_SCALES: Record<string, number> = {
	'xx-small': 0.6,
	'x-small': 0.75,
	small: 0.89,
	medium: 1,
	large: 1.2,
	'x-large': 1.5,
	'xx-large': 2,
};

// A size far off the default is more likely a misread unit than a request; keep text legible
// and inside its system.
const MIN_FONT_SCALE = 0.5;
const MAX_FONT_SCALE = 3;

/* A font-size, in points or a CSS size name, as a ratio to the document's default text
 * size (`base`, in points; DEFAULT_TEXT_POINTS when absent). 1 for an absent or
 * unreadable size. */
export function fontScaleOf(size: string | null, base: string | null): number {
	if (size === null) {
		return 1;
	}
	const named = CSS_FONT_SCALES[size];
	if (named !== undefined) {
		return named;
	}
	const points = Number(size);
	const basePoints = Number(base ?? DEFAULT_TEXT_POINTS);
	if (!(points > 0) || !(basePoints > 0)) {
		return 1;
	}
	return Math.min(
		Math.max(points / basePoints, MIN_FONT_SCALE),
		MAX_FONT_SCALE,
	);
}
