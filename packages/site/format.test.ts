import { expect, it } from 'bun:test';
import { formatPitch } from './format';

it.each([
	{ step: 'E', alter: -1, octave: 3, label: 'E♭3' },
	{ step: 'F', alter: 1, octave: 4, label: 'F♯4' },
	{ step: 'C', alter: 0, octave: 5, label: 'C5' },
	{ step: 'B', alter: -2, octave: 3, label: 'B♭♭3' },
	{ step: 'G', alter: 2, octave: 4, label: 'G♯♯4' },
	{ step: 'C', alter: 0.5, octave: 4, label: 'C4 (+0.5 st)' },
	{ step: 'D', alter: -0.5, octave: 4, label: 'D4 (-0.5 st)' },
])('formats $label for pitch selection', ({ step, alter, octave, label }) => {
	expect(formatPitch({ step, alter, octave })).toBe(label);
});
