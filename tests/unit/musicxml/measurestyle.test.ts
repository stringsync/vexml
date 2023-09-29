import { MeasureStyle } from '@/musicxml';
import { xml } from '@/util';

describe(MeasureStyle, () => {
  describe('getStaffNumber', () => {
    it('returns the number of the measure style', () => {
      const node = xml.measureStyle({ staffNumber: 4 });
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getStaffNumber()).toBe(4);
    });

    it('defaults to 1 when number is missing', () => {
      const node = xml.measureStyle();
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getStaffNumber()).toBe(1);
    });

    it('defaults to 1 when number is invalid', () => {
      const node = xml.measureStyle({ staffNumber: NaN });
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getStaffNumber()).toBe(1);
    });
  });

  describe('getMultipleRestCount', () => {
    it('returns the multiple rest count', () => {
      const node = xml.measureStyle({ multipleRest: xml.multipleRest({ multipleRestCount: 4 }) });
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getMultipleRestCount()).toBe(4);
    });

    it('returns 0 when multiple rest is missing', () => {
      const node = xml.measureStyle();
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getMultipleRestCount()).toBe(0);
    });

    it('returns 0 when multiple rest is invalid', () => {
      const node = xml.measureStyle({ multipleRest: xml.multipleRest({ multipleRestCount: NaN }) });
      const measureStyle = new MeasureStyle(node);
      expect(measureStyle.getMultipleRestCount()).toBe(0);
    });
  });
});
