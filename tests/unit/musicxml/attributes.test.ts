import { Attributes } from '@/musicxml/attributes';
import { Clef } from '@/musicxml/clef';
import { Key } from '@/musicxml/key';
import { Time } from '@/musicxml/time';
import { StaveDetails } from '@/musicxml/stavedetails';
import { xml } from '@/util';
import { MeasureStyle } from '@/musicxml/measurestyle';

describe(Attributes, () => {
  describe('getStaveCount', () => {
    it('returns the number of staves', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: 4 }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(4);
    });

    it('returns null when there is no staves element', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBeNull();
    });

    it('returns null when the staves element is empty', () => {
      const node = xml.attributes({ staves: xml.staves() });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBeNull();
    });

    it('returns null when the staves text content is invalid', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: NaN }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBeNull();
    });
  });

  describe('getTimes', () => {
    it('returns the times', () => {
      const time = xml.time({
        times: [{ beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '8' }) }],
      });
      const node = xml.attributes({ times: [time] });
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toStrictEqual([new Time(time)]);
    });

    it('returns an empty array when times are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toBeEmpty();
    });
  });

  describe('getKeys', () => {
    it('returns the keys', () => {
      const key = xml.key();
      const node = xml.attributes({ keys: [key] });
      const attributes = new Attributes(node);
      expect(attributes.getKeys()).toStrictEqual([new Key(key)]);
    });

    it('returns an empty array when keys are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getKeys()).toBeEmpty();
    });
  });

  describe('getClefs', () => {
    it('returns the clefs', () => {
      const clef = xml.clef();
      const node = xml.attributes({ clefs: [clef] });
      const attributes = new Attributes(node);
      expect(attributes.getClefs()).toStrictEqual([new Clef(clef)]);
    });

    it('returns an empty array when keys are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getClefs()).toBeEmpty();
    });
  });

  describe('getStaveDetails', () => {
    it('returns the stave details', () => {
      const staffDetails1 = xml.staffDetails();
      const staffDetails2 = xml.staffDetails();
      const node = xml.attributes({ staffDetails: [staffDetails1, staffDetails2] });

      const attributes = new Attributes(node);

      expect(attributes.getStaveDetails()).toStrictEqual([
        new StaveDetails(staffDetails1),
        new StaveDetails(staffDetails2),
      ]);
    });

    it('returns an empty array when staff details are missing', () => {
      const node = xml.attributes({});
      const attributes = new Attributes(node);
      expect(attributes.getStaveDetails()).toBeEmpty();
    });
  });

  describe('getMeasureStyles', () => {
    it('returns the measure styles', () => {
      const measureStyle1 = xml.measureStyle();
      const measureStyle2 = xml.measureStyle();
      const node = xml.attributes({ measureStyles: [measureStyle1, measureStyle2] });

      const attributes = new Attributes(node);

      expect(attributes.getMeasureStyles()).toStrictEqual([
        new MeasureStyle(measureStyle1),
        new MeasureStyle(measureStyle2),
      ]);
    });

    it('returns an empty array when measure styles are missing', () => {
      const node = xml.attributes({});
      const attributes = new Attributes(node);
      expect(attributes.getMeasureStyles()).toBeEmpty();
    });
  });

  describe('getQuarterNoteDivisions', () => {
    it('returns the attributes divisions', () => {
      const node = xml.attributes({
        divisions: xml.divisions({ positiveDivisions: 4 }),
      });
      const attributes = new Attributes(node);
      expect(attributes.getQuarterNoteDivisions()).toBe(4);
    });

    it('defaults to null when missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getQuarterNoteDivisions()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.attributes({
        divisions: xml.divisions({ positiveDivisions: NaN }),
      });
      const attributes = new Attributes(node);
      expect(attributes.getQuarterNoteDivisions()).toBeNull();
    });
  });
});
