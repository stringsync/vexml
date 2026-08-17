// Popular options for the instrument picker. '' uses smplr's high-quality SplendidGrandPiano;
// every other value is a General MIDI name loaded via smplr's Soundfont. Order is the menu order.
export const INSTRUMENTS: ReadonlyArray<{ label: string; value: string }> = [
	{ label: 'Grand Piano', value: '' },
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
