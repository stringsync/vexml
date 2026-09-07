import { describe, expect, it } from 'bun:test';
import { formatPitch } from './format';

describe('formatPitch', () => {
	it('formats a flat pitch', () => {
		expect(formatPitch({ step: 'E', alter: -1, octave: 3 })).toBe('E♭3');
	});

	it('formats a sharp pitch', () => {
		expect(formatPitch({ step: 'F', alter: 1, octave: 4 })).toBe('F♯4');
	});

	it('formats a natural pitch without an accidental', () => {
		expect(formatPitch({ step: 'C', alter: 0, octave: 5 })).toBe('C5');
	});

	it('formats a double-flat pitch', () => {
		expect(formatPitch({ step: 'B', alter: -2, octave: 3 })).toBe('B♭♭3');
	});

	it('formats a double-sharp pitch', () => {
		expect(formatPitch({ step: 'G', alter: 2, octave: 4 })).toBe('G♯♯4');
	});

	it('formats a fractional sharp alteration in semitones', () => {
		expect(formatPitch({ step: 'C', alter: 0.5, octave: 4 })).toBe(
			'C4 (+0.5 st)',
		);
	});

	it('formats a fractional flat alteration in semitones', () => {
		expect(formatPitch({ step: 'D', alter: -0.5, octave: 4 })).toBe(
			'D4 (-0.5 st)',
		);
	});
});
