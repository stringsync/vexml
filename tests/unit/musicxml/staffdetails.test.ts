import { STAVE_TYPES, StaveDetails } from '@/musicxml';
import { xml } from '@/util';

describe(StaveDetails, () => {
  describe('getStaveType', () => {
    it.each(STAVE_TYPES.values)('returns the staff type: %s', (value) => {
      const staffType = xml.staffType({ value });
      const node = xml.staffDetails({ staffType });

      const staveDetails = new StaveDetails(node);

      expect(staveDetails.getStaveType()).toBe(value);
    });

    it('returns regular for invalid staff types', () => {
      const staffType = xml.staffType({ value: 'invalid staff type' });
      const node = xml.staffDetails({ staffType });

      const staveDetails = new StaveDetails(node);

      expect(staveDetails.getStaveType()).toBe('regular');
    });

    it('returns regular for missing staff types', () => {
      const node = xml.staffDetails({});
      const staveDetails = new StaveDetails(node);
      expect(staveDetails.getStaveType()).toBe('regular');
    });
  });

  describe('getStaveNumber', () => {
    it('returns the staff number', () => {
      const node = xml.staffDetails({ number: 2 });
      const staveDetails = new StaveDetails(node);
      expect(staveDetails.getStaveNumber()).toBe(2);
    });

    it(`defaults to '1' when invalid staff number`, () => {
      const node = xml.staffDetails({ number: NaN });
      const staveDetails = new StaveDetails(node);
      expect(staveDetails.getStaveNumber()).toBe(1);
    });

    it(`defaults to '1' when staff number missing`, () => {
      const node = xml.staffDetails({});
      const staveDetails = new StaveDetails(node);
      expect(staveDetails.getStaveNumber()).toBe(1);
    });
  });

  describe('getStaveLines', () => {
    it('returns the number of staff lines', () => {
      const staffLines = xml.staffLines({ value: 6 });
      const node = xml.staffDetails({ staffLines });

      const staveDetails = new StaveDetails(node);

      expect(staveDetails.getStaveLines()).toBe(6);
    });

    it('defaults to 5 when missing', () => {
      const node = xml.staffDetails({});
      const staveDetails = new StaveDetails(node);
      expect(staveDetails.getStaveLines()).toBe(5);
    });

    it('defaults to 5 when invalid', () => {
      const staffLines = xml.staffLines({ value: NaN });
      const node = xml.staffDetails({ staffLines });

      const staveDetails = new StaveDetails(node);

      expect(staveDetails.getStaveLines()).toBe(5);
    });
  });
});
