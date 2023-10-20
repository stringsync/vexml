import { Metronome } from '@/musicxml';

describe(Metronome, () => {
  describe('getBeatUnit', () => {
    it.todo('returns the beat unit of the metronome');

    it.todo('defaults to quarter when beat unit is missing');

    it.todo('defaults to quarter when beat unit is invalid');
  });

  describe('getDotCount', () => {
    it.todo('returns how many dots the metronome has');

    it.todo('defaults to 0 when dots are missing');
  });

  describe('getBeatsPerMinute', () => {
    it.todo('returns the bpm of the metronome');

    it.todo('defaults to 120 when missing');

    it.todo('does not support non-numeric bpm specifications and defaults to 120');
  });
});
