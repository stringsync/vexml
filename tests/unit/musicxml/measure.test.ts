import { Attributes } from '@/musicxml/attributes';
import { Barline } from '@/musicxml/barline';
import { Measure } from '@/musicxml/measure';
import { Note } from '@/musicxml/note';
import { Print } from '@/musicxml/print';
import { xml } from '@/util';
import { Backup } from '@/musicxml/backup';
import { Forward } from '@/musicxml/forward';
import { Direction } from '@/musicxml/direction';

describe(Measure, () => {
  describe('isImplicit', () => {
    it('returns whether the measure number should show', () => {
      const node = xml.measure({ implicit: 'yes' });
      const measure = new Measure(node);
      expect(measure.isImplicit()).toBeTrue();
    });

    it('defaults to false when missing', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.isImplicit()).toBeFalse();
    });

    it('defaults to false when invalid', () => {
      const node = xml.measure({ implicit: 'lol' });
      const measure = new Measure(node);
      expect(measure.isImplicit()).toBeFalse();
    });
  });

  describe('getNumber', () => {
    it('returns the measure number', () => {
      const node = xml.measure({ number: '1' });
      const measure = new Measure(node);
      expect(measure.getNumber()).toBe('1');
    });

    it('returns empty string when the measure number is missing', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getNumber()).toBe('');
    });
  });

  describe('hasWidth', () => {
    it('returns true when the measure width is set', () => {
      const node = xml.measure({ width: 42 });
      const measure = new Measure(node);
      expect(measure.hasWidth()).toBeTrue();
    });

    it('returns false when the measure width is not set', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.hasWidth()).toBeFalse();
    });
  });

  describe('getWidth', () => {
    it('returns the measure width', () => {
      const node = xml.measure({ width: 42 });
      const measure = new Measure(node);
      expect(measure.getWidth()).toBe(42);
    });

    it('defaults null when the measure width is missing', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getWidth()).toBeNull();
    });

    it('defaults null when the measure width is invalid', () => {
      const node = xml.measure({ width: NaN });
      const measure = new Measure(node);
      expect(measure.getWidth()).toBeNull();
    });
  });

  describe('getAttributes', () => {
    it('returns the attributes elements', () => {
      const attributes1 = xml.attributes();
      const attributes2 = xml.attributes();
      const node = xml.measure({ attributes: [attributes1, attributes2] });

      const measure = new Measure(node);

      expect(measure.getAttributes()).toStrictEqual([new Attributes(attributes1), new Attributes(attributes2)]);
    });
  });

  describe('getBarlines', () => {
    it('returns the barlines of the measure', () => {
      const barline1 = xml.barline();
      const barline2 = xml.barline();
      const node = xml.measure({ barlines: [barline1, barline2] });

      const measure = new Measure(node);

      expect(measure.getBarlines()).toStrictEqual([new Barline(barline1), new Barline(barline2)]);
    });

    it('returns an empty array when there are no barlines', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getBarlines()).toBeEmpty();
    });
  });

  describe('getPrints', () => {
    it('returns the prints of the measure', () => {
      const print1 = xml.print();
      const print2 = xml.print();
      const node = xml.measure({ prints: [print1, print2] });

      const measure = new Measure(node);

      expect(measure.getPrints()).toStrictEqual([new Print(print1), new Print(print2)]);
    });
  });

  describe('getEntries', () => {
    it('returns the notes, backups, and forwards of the measure', () => {
      const attributes1 = xml.attributes();
      const note1 = xml.note();
      const backup = xml.backup({ duration: xml.duration({ positiveDivisions: 4 }) });
      const attributes2 = xml.attributes();
      const note2 = xml.note();
      const forward = xml.forward({ duration: xml.duration({ positiveDivisions: 8 }) });
      const note3 = xml.note();
      const direction = xml.direction();

      const node = xml.measure({
        entries: [attributes1, note1, backup, attributes2, note2, forward, note3, direction],
      });
      const measure = new Measure(node);

      expect(measure.getEntries()).toStrictEqual([
        new Attributes(attributes1),
        new Note(note1),
        new Backup(backup),
        new Attributes(attributes2),
        new Note(note2),
        new Forward(forward),
        new Note(note3),
        new Direction(direction),
      ]);
    });

    it('returns an empty array when the measure is empty', () => {
      const node = xml.measure();
      const measure = new Measure(node);
      expect(measure.getEntries()).toBeEmpty();
    });
  });

  describe('getEndingMeasure', () => {
    it('returns the ending measure for multi rest measures', () => {
      const measure1 = xml.measure({
        number: '1',
        attributes: [
          xml.attributes({
            measureStyles: [
              xml.measureStyle({
                multipleRest: xml.multipleRest({ multipleRestCount: 3 }),
              }),
            ],
          }),
        ],
      });
      const measure2 = xml.measure({ number: '2' });
      const measure3 = xml.measure({ number: '3' });
      xml.part({ measures: [measure1, measure2, measure3] });

      expect(new Measure(measure1).getEndingMeasure()).toStrictEqual(new Measure(measure3));
    });

    it('returns itself if its not an multi rest measure', () => {
      const measure1 = xml.measure({ number: '1' });
      const measure2 = xml.measure({ number: '2' });
      xml.part({ measures: [measure1, measure2] });

      expect(new Measure(measure1).getEndingMeasure()).toStrictEqual(new Measure(measure1));
    });
  });
});
