/*
 * A CSS font shorthand read into its parts, without a DOM: `italic 600 30pt 'Bravura', serif`.
 * Reads what canvas fonts vexml and vexflow write; a shorthand it can't place a size in is null.
 */
export class CssFont {
	private constructor(
		readonly style: 'normal' | 'italic' | 'oblique',
		// The weight as written (`bold`, `600`), and as a number.
		readonly weightName: string,
		readonly weight: number,
		// The size as written (`30pt`), and in px.
		readonly size: string,
		readonly sizePx: number,
		// The families in order, unquoted.
		readonly families: readonly string[],
	) {}

	static parse(shorthand: string): CssFont | null {
		let style: CssFont['style'] = 'normal';
		let weightName = 'normal';
		const words = shorthand.trim().split(/\s+/);
		let at = 0;
		for (; at < words.length; at++) {
			const word = words[at] ?? '';
			if (word === 'italic' || word === 'oblique') {
				style = word;
			} else if (WEIGHTS.has(word) || /^\d{1,4}$/.test(word)) {
				weightName = word;
			} else if (!MODIFIERS.has(word)) {
				break;
			}
		}
		// The size, with any line height after a slash, then the families to the end.
		const size = (words[at] ?? '').split('/')[0] ?? '';
		const sizePx = toPx(size);
		if (sizePx === null) {
			return null;
		}
		const families = words
			.slice(at + 1)
			.join(' ')
			.split(',')
			.map((name) => name.trim().replace(/^(['"])(.*)\1$/, '$2'))
			.filter((name) => name.length > 0);
		return new CssFont(
			style,
			weightName,
			WEIGHTS.get(weightName) ?? Number(weightName),
			size,
			sizePx,
			families,
		);
	}
}

const WEIGHTS = new Map([
	['normal', 400],
	['bold', 700],
	['lighter', 300],
	['bolder', 700],
]);
const MODIFIERS = new Set(['normal', 'small-caps']);
const UNITS: Record<string, number> = {
	px: 1,
	pt: 4 / 3,
	pc: 16,
	in: 96,
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	em: 16,
	rem: 16,
};

function toPx(size: string): number | null {
	const match = /^(\d*\.?\d+)([a-z]+)$/.exec(size);
	const unit = match ? UNITS[match[2] ?? ''] : undefined;
	return match && unit !== undefined ? Number(match[1]) * unit : null;
}
