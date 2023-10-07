import { STAFF_TYPES, StaveDetails } from '@/musicxml';
import { xml } from '@/util';

describe(StaveDetails, () => {
  describe('getStaffType', () => {
    it.each(STAFF_TYPES.values)('returns the staff type: %s', (value) => {
      const staffType = xml.staffType({ value });
      const node = xml.staffDetails({ staffType });

      const staffDetails = new StaveDetails(node);

      expect(staffDetails.getStaffType()).toBe(value);
    });

    it('returns regular for invalid staff types', () => {
      const staffType = xml.staffType({ value: 'invalid staff type' });
      const node = xml.staffDetails({ staffType });

      const staffDetails = new StaveDetails(node);

      expect(staffDetails.getStaffType()).toBe('regular');
    });

    it('returns regular for missing staff types', () => {
      const node = xml.staffDetails({});
      const staffDetails = new StaveDetails(node);
      expect(staffDetails.getStaffType()).toBe('regular');
    });
  });

  describe('getStaffNumber', () => {
    describe('getStaffNumber', () => {
      it('returns the staff number', () => {
        const node = xml.staffDetails({ number: 2 });
        const staffDetails = new StaveDetails(node);
        expect(staffDetails.getStaffNumber()).toBe(2);
      });

      it(`defaults to '1' when invalid staff number`, () => {
        const node = xml.staffDetails({ number: NaN });
        const staffDetails = new StaveDetails(node);
        expect(staffDetails.getStaffNumber()).toBe(1);
      });

      it(`defaults to '1' when staff number missing`, () => {
        const node = xml.staffDetails({});
        const staffDetails = new StaveDetails(node);
        expect(staffDetails.getStaffNumber()).toBe(1);
      });
    });
  });

  describe('getStaffLines', () => {
    it('returns the number of staff lines', () => {
      const staffLines = xml.staffLines({ value: 6 });
      const node = xml.staffDetails({ staffLines });

      const staffDetails = new StaveDetails(node);

      expect(staffDetails.getStaffLines()).toBe(6);
    });

    it('defaults to 5 when missing', () => {
      const node = xml.staffDetails({});
      const staffDetails = new StaveDetails(node);
      expect(staffDetails.getStaffLines()).toBe(5);
    });

    it('defaults to 5 when invalid', () => {
      const staffLines = xml.staffLines({ value: NaN });
      const node = xml.staffDetails({ staffLines });

      const staffDetails = new StaveDetails(node);

      expect(staffDetails.getStaffLines()).toBe(5);
    });
  });
});
