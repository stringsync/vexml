import { describe, expect, it } from 'bun:test';
import { TempoMap } from './tempo-map';

describe('TempoMap', () => {
	it('assumes 120 bpm when the score declares no tempo', () => {
		const tempo = new TempoMap([]);
		expect(tempo.msAt(4)).toBeCloseTo(2000);
		expect(tempo.beatsAt(2000)).toBeCloseTo(4);
	});

	it('honors a mid-piece tempo change, and converts back to the beat it started from', () => {
		const tempo = new TempoMap([
			{ startBeat: 0, endBeat: 4, bpm: 120 }, // 500 ms / beat
			{ startBeat: 4, endBeat: 8, bpm: 60 }, // 1000 ms / beat
		]);
		expect(tempo.msAt(4)).toBeCloseTo(2000);
		expect(tempo.msAt(6)).toBeCloseTo(4000);
		expect(tempo.msAt(8)).toBeCloseTo(6000);
		expect(tempo.beatsAt(4000)).toBeCloseTo(6);
		expect(tempo.beatsAt(tempo.msAt(6.5))).toBeCloseTo(6.5);
	});

	it('extrapolates past the last segment at its rate', () => {
		const tempo = new TempoMap([{ startBeat: 0, endBeat: 4, bpm: 120 }]);
		expect(tempo.msAt(6)).toBeCloseTo(3000);
		expect(tempo.beatsAt(3000)).toBeCloseTo(6);
	});
});
