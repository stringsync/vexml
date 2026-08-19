/* The piano the site plays through: one Soundfont file, like every other entry here. */
export const GRAND_PIANO = 'acoustic_grand_piano';

/* What a first visit opens with. A marimba's short, dry notes make a rhythm easy to follow
 * against the moving cursor, which is what this site is for. */
export const OPENING_INSTRUMENT = 'marimba';

// Popular options for the instrument picker. Every value is a General MIDI name loaded via
// smplr's Soundfont. Order is the menu order.
export const INSTRUMENTS: ReadonlyArray<{ label: string; value: string }> = [
	{ label: 'Grand Piano', value: GRAND_PIANO },
	{ label: 'Electric Piano', value: 'electric_piano_1' },
	{ label: 'Harpsichord', value: 'harpsichord' },
	{ label: 'Acoustic Guitar', value: 'acoustic_guitar_nylon' },
	{ label: 'Vibraphone', value: 'vibraphone' },
	{ label: 'Marimba', value: 'marimba' },
	{ label: 'Church Organ', value: 'church_organ' },
	{ label: 'Violin', value: 'violin' },
	{ label: 'Cello', value: 'cello' },
	{ label: 'Flute', value: 'flute' },
	{ label: 'Trumpet', value: 'trumpet' },
];
