import * as xml from './xml';
import { Beam } from './beam';
import { BEAM_VALUES } from './enums';

describe(Beam, () => {
  describe('getNumber', () => {
    it('returns the number of the beam', () => {
      const node = xml.beam({ number: 4 });
      const beam = new Beam(node);
      expect(beam.getNumber()).toBe(4);
    });

    it('defaults to 1', () => {
      const node = xml.beam();
      const beam = new Beam(node);
      expect(beam.getNumber()).toBe(1);
    });

    it('enforces a lower bound of 1', () => {
      const node = xml.beam({ number: 0 });
      const beam = new Beam(node);
      expect(beam.getNumber()).toBe(1);
    });

    it('enforces an upper bound of 8', () => {
      const node = xml.beam({ number: 9 });
      const beam = new Beam(node);
      expect(beam.getNumber()).toBe(8);
    });
  });

  describe('getBeamValue', () => {
    it('returns the beam value of the beam', () => {
      const node = xml.beam({ beamValue: 'continue' });
      const beam = new Beam(node);
      expect(beam.getBeamValue()).toBe('continue');
    });

    it('defaults to the first BEAM_VALUES value', () => {
      const node = xml.beam();
      const beam = new Beam(node);
      expect(beam.getBeamValue()).toBe(BEAM_VALUES.values[0]);
    });
  });
});
